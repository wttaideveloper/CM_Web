"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  formatServiceBookingAppointment,
  formatServiceBookingEnum,
  isServiceBookingCancellationApprovalAllowed,
  isServiceBookingCancellationEligible,
} from "../service-booking-management";
import {
  approveServiceBookingCancellation,
  getServiceBookingDetail,
  rejectServiceBookingCancellation,
  serviceBookingCancellationDecisionErrorMessage,
  ServiceBookingApiError,
  type ServiceBookingCancellationRequest,
} from "../service-booking.service";
import { serviceBookingCopy } from "../service-booking-copy.en";

type Decision = "approve" | "reject";

type ServiceBookingCancellationDecisionControlsProps = {
  request: ServiceBookingCancellationRequest;
  onOpenBooking: () => void;
};

/** Renders safe, contract-backed cancellation decision controls for one pending request. */
export function ServiceBookingCancellationDecisionControls({ request, onOpenBooking }: ServiceBookingCancellationDecisionControlsProps) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const eligible = isServiceBookingCancellationEligible(request.request_status, request.booking_status);
  const paidBooking = !isServiceBookingCancellationApprovalAllowed(request.payment_status);
  const approvalBlocked = paidBooking ? serviceBookingCopy.paidCancellationApprovalBlocked : null;

  const detailQuery = useQuery({
    queryKey: ["enterprise-service-booking-detail", request.booking_id],
    queryFn: ({ signal }) => getServiceBookingDetail(request.booking_id, signal),
    enabled: decision !== null,
    staleTime: 15_000,
    retry: (failureCount, error) => !(error instanceof ServiceBookingApiError && [401, 403, 404, 422].includes(error.status)) && failureCount < 1,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (decision === "approve") return approveServiceBookingCancellation(request.booking_id, reason.trim() ? { reason: reason.trim() } : {});
      return rejectServiceBookingCancellation(request.booking_id, { reason: reason.trim() });
    },
    retry: false,
    onSuccess: (booking) => {
      setDecision(null);
      setReason("");
      setValidationError(null);
      setSuccessMessage(`Cancellation decision applied. Booking status: ${formatServiceBookingEnum(booking.status)}.`);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-detail", request.booking_id] }),
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-history", request.booking_id] }),
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-cancellation-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["service-booking-slots"] }),
        queryClient.invalidateQueries({ queryKey: ["service-booking-settings"] }),
      ]);
    },
    onError: async () => {
      // Refresh state before the user can deliberately retry after an ambiguous failure.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-detail", request.booking_id] }),
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-cancellation-requests"] }),
      ]);
    },
  });

  const openDecision = (nextDecision: Decision) => {
    setSuccessMessage(null);
    setValidationError(null);
    setReason("");
    setDecision(nextDecision);
  };

  const confirmDecision = () => {
    if (decision === "reject" && reason.trim().length < 3) {
      setValidationError(serviceBookingCopy.rejectionReasonTooShort);
      return;
    }
    mutation.mutate();
  };

  const disabledReason = !eligible
    ? serviceBookingCopy.cancellationAlreadyProcessed
    : approvalBlocked;

  return (
    <div className="min-w-[175px]">
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onOpenBooking} className="text-left text-xs font-semibold text-[#1f6a58] underline">{serviceBookingCopy.viewDetails}</button>
        <button type="button" disabled={!eligible || Boolean(approvalBlocked) || mutation.isPending} title={approvalBlocked ?? disabledReason ?? undefined} onClick={() => openDecision("approve")} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{serviceBookingCopy.cancellationApprove}</button>
        <button type="button" disabled={!eligible || mutation.isPending} title={disabledReason ?? undefined} onClick={() => openDecision("reject")} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{serviceBookingCopy.cancellationReject}</button>
        {approvalBlocked ? <span className="text-[11px] leading-4 text-[#8a5a00]">{approvalBlocked}</span> : null}
        {!eligible ? <span className="text-[11px] leading-4 text-[#7f9d94]">{serviceBookingCopy.cancellationAlreadyProcessed}</span> : null}
      </div>
      {successMessage ? <p role="status" className="mt-2 text-[11px] leading-4 text-[#1f6a58]">{successMessage}</p> : null}
      {decision ? (
        <div className="fixed inset-0 z-[120] flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="service-booking-cancellation-decision-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl">
            <h2 id="service-booking-cancellation-decision-title" className="text-lg font-bold text-[#06201c]">{decision === "approve" ? serviceBookingCopy.confirmCancellationApproval : serviceBookingCopy.confirmCancellationRejection}</h2>
            <div className="mt-3 grid gap-3 rounded-xl bg-[#f9fcfa] p-4 text-sm sm:grid-cols-2">
              <span><strong>Customer:</strong> {request.customer.name || request.customer.email || request.customer.user_id || serviceBookingCopy.noValue}</span>
              <span><strong>Service:</strong> {request.service_name}</span>
              <span><strong>Appointment:</strong> {formatServiceBookingAppointment(request.starts_at, request.ends_at, request.timezone)}</span>
              <span><strong>Current status:</strong> {formatServiceBookingEnum(request.booking_status)}</span>
              <span><strong>Cancellation reason:</strong> {request.reason || serviceBookingCopy.noValue}</span>
              <span><strong>Payment:</strong> {formatServiceBookingEnum(request.payment_status)}{request.refund_status ? ` · Refund ${formatServiceBookingEnum(request.refund_status)}` : ""}</span>
              {detailQuery.isPending ? <span role="status" className="sm:col-span-2">{serviceBookingCopy.loadingCancellationDetails}</span> : null}
              {detailQuery.data ? <span className="sm:col-span-2"><strong>Cancellation policy:</strong> {detailQuery.data.cancellation_policy_summary || detailQuery.data.cancellation_policy || serviceBookingCopy.noValue}</span> : null}
              {detailQuery.isError ? <span className="sm:col-span-2 text-[#8f3b2f]">{serviceBookingCopy.cancellationDetailsUnavailable}</span> : null}
            </div>
            <label className="mt-4 block text-sm font-semibold text-[#06201c]">
              {decision === "reject" ? serviceBookingCopy.rejectionReason : serviceBookingCopy.approvalReason}
              {decision === "reject" ? <span className="font-normal text-[#8f3b2f]"> *</span> : <span className="font-normal text-[#52736a]"> ({serviceBookingCopy.optional})</span>}
              <textarea value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} disabled={mutation.isPending} rows={3} className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 font-normal outline-none focus:border-[#1f6a58] disabled:opacity-60" />
            </label>
            {validationError ? <p role="alert" className="mt-2 text-sm text-[#8f3b2f]">{validationError}</p> : null}
            {mutation.isError ? <p role="alert" className="mt-2 text-sm text-[#8f3b2f]">{serviceBookingCancellationDecisionErrorMessage(mutation.error)}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDecision(null)} disabled={mutation.isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">{serviceBookingCopy.cancel}</button>
              <button type="button" onClick={confirmDecision} disabled={mutation.isPending || (decision === "approve" && Boolean(approvalBlocked))} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60">{mutation.isPending ? serviceBookingCopy.submittingCancellationDecision : serviceBookingCopy.confirmStatus}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
