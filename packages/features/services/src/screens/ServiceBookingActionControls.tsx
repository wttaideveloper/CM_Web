"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { formatServiceBookingEnum, getServiceBookingAllowedNextStatuses } from "../service-booking-management";
import {
  getServiceBookingDetail,
  serviceBookingStatusErrorMessage,
  ServiceBookingApiError,
  updateServiceBookingStatus,
} from "../service-booking.service";
import { serviceBookingCopy } from "../service-booking-copy.en";

type ServiceBookingActionControlsProps = {
  bookingId: string | null;
};

/** Enterprise Admin status controls driven exclusively by the detail response's allowed_statuses. */
export function ServiceBookingActionControls({ bookingId }: ServiceBookingActionControlsProps) {
  const queryClient = useQueryClient();
  const [targetStatus, setTargetStatus] = useState("");
  const [reason, setReason] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["enterprise-service-booking-detail", bookingId],
    queryFn: ({ signal }) => getServiceBookingDetail(bookingId ?? "", signal),
    enabled: Boolean(bookingId),
    staleTime: 15_000,
    retry: (failureCount, error) =>
      !(error instanceof ServiceBookingApiError && [401, 403, 404, 422].includes(error.status)) && failureCount < 1,
  });

  const allowedStatuses = useMemo(
    () => getServiceBookingAllowedNextStatuses(detailQuery.data?.status ?? "", detailQuery.data?.allowed_statuses),
    [detailQuery.data?.allowed_statuses, detailQuery.data?.status],
  );
  const activeTargetStatus = allowedStatuses.includes(targetStatus) ? targetStatus : "";
  const reasonSupported = activeTargetStatus === "cancelled" || activeTargetStatus === "cancellation_requested";

  const mutation = useMutation({
    mutationFn: () => updateServiceBookingStatus(bookingId ?? "", {
      status: activeTargetStatus,
      ...(reasonSupported && reason.trim() ? { reason: reason.trim() } : {}),
    }),
    retry: false,
    onSuccess: (booking) => {
      setConfirmationOpen(false);
      setTargetStatus("");
      setReason("");
      setSuccessMessage(`Booking status updated to ${formatServiceBookingEnum(booking.status)}.`);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-detail", bookingId] }),
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-history", bookingId] }),
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["enterprise-service-booking-cancellation-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["service-booking-slots"] }),
        queryClient.invalidateQueries({ queryKey: ["service-booking-settings"] }),
      ]);
    },
  });

  if (!bookingId) {
    return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="service-booking-actions-title"><h3 id="service-booking-actions-title" className="text-base font-bold text-[#06201c]">{serviceBookingCopy.actionsTitle}</h3><p className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.selectDetails}</p></section>;
  }

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="service-booking-actions-title">
      <h3 id="service-booking-actions-title" className="text-base font-bold text-[#06201c]">{serviceBookingCopy.actionsTitle}</h3>
      {detailQuery.isPending ? <p role="status" className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.detailLoading}</p> : null}
      {detailQuery.isError ? <p role="alert" className="mt-2 text-sm text-[#8f3b2f]">{serviceBookingCopy.actionsError}</p> : null}
      {detailQuery.data ? (
        <>
          <p className="mt-2 text-sm text-[#52736a]">Current status: <span className="font-semibold text-[#06201c]">{formatServiceBookingEnum(detailQuery.data.status)}</span></p>
          {allowedStatuses.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1">
                <span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.nextStatus}</span>
                <select
                  value={activeTargetStatus}
                  onChange={(event) => { setSuccessMessage(null); setTargetStatus(event.target.value); }}
                  disabled={mutation.isPending}
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58] disabled:opacity-60"
                >
                  <option value="">{serviceBookingCopy.chooseStatus}</option>
                  {allowedStatuses.map((status) => <option key={status} value={status}>{formatServiceBookingEnum(status)}</option>)}
                </select>
              </label>
              <button type="button" disabled={!activeTargetStatus || mutation.isPending} onClick={() => { setSuccessMessage(null); setConfirmationOpen(true); }} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{serviceBookingCopy.updateStatus}</button>
            </div>
          ) : <p className="mt-4 text-sm text-[#52736a]">{serviceBookingCopy.noAllowedStatuses}</p>}
        </>
      ) : null}
      {mutation.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-[#8f3b2f]">{serviceBookingStatusErrorMessage(mutation.error)}</p> : null}
      {successMessage ? <p role="status" className="mt-3 text-sm font-semibold text-[#1f6a58]">{successMessage}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <a href="#service-booking-cancellation-requests" className="inline-flex h-10 items-center rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#1f6a58] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">{serviceBookingCopy.reviewCancellation}</a>
        <p className="basis-full text-xs text-[#7f9d94]">{serviceBookingCopy.cancellationActionsPending}</p>
      </div>

      {confirmationOpen && activeTargetStatus ? (
        <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4" role="dialog" aria-modal="false" aria-labelledby="service-booking-status-confirm-title">
          <h4 id="service-booking-status-confirm-title" className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.confirmStatusTitle}</h4>
          <p className="mt-1 text-sm text-[#52736a]">{serviceBookingCopy.confirmStatusDescription.replace("{{status}}", formatServiceBookingEnum(activeTargetStatus))}</p>
          {reasonSupported ? (
            <label className="mt-3 block text-sm font-semibold text-[#06201c]">{serviceBookingCopy.statusReason} <span className="font-normal text-[#52736a]">({serviceBookingCopy.optional})</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={mutation.isPending} rows={3} className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 font-normal outline-none focus:border-[#1f6a58] disabled:opacity-60" /></label>
          ) : null}
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmationOpen(false)} disabled={mutation.isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">{serviceBookingCopy.cancel}</button>
            <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60">{mutation.isPending ? serviceBookingCopy.updatingStatus : serviceBookingCopy.confirmStatus}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
