"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { formatServiceBookingAppointment, formatServiceBookingEnum } from "../service-booking-management";
import {
  type ServiceBookingDetail,
  type ServiceBookingHistoryItem,
  getServiceBookingDetail,
  getServiceBookingHistory,
  ServiceBookingApiError,
} from "../service-booking.service";
import { serviceBookingCopy } from "../service-booking-copy.en";

type ServiceBookingDetailsPanelProps = {
  bookingId: string | null;
  onClearSelection: () => void;
};

const VENUE_FIELDS = ["name", "line1", "line2", "city", "state", "postal_code", "country", "lat", "lng", "phone", "instructions"] as const;
const MEETING_FIELDS = ["provider", "joins_at", "available", "url", "passcode", "instructions"] as const;

/** Loads and renders one read-only Enterprise Service Booking detail and its history. */
export function ServiceBookingDetailsPanel({ bookingId, onClearSelection }: ServiceBookingDetailsPanelProps) {
  const detailQuery = useQuery({
    queryKey: ["enterprise-service-booking-detail", bookingId],
    queryFn: ({ signal }) => getServiceBookingDetail(bookingId ?? "", signal),
    enabled: Boolean(bookingId),
    staleTime: 15_000,
    retry: retryRead,
  });

  const historyEndpointEnabled = Boolean(bookingId && detailQuery.data && detailQuery.data.history === undefined);
  const historyQuery = useQuery({
    queryKey: ["enterprise-service-booking-history", bookingId],
    queryFn: ({ signal }) => getServiceBookingHistory(bookingId ?? "", signal),
    enabled: historyEndpointEnabled,
    staleTime: 15_000,
    retry: retryRead,
  });

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="service-booking-details-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="service-booking-details-title" className="text-base font-bold text-[#06201c]">{serviceBookingCopy.detailsTitle}</h3>
          {bookingId ? <p className="mt-1 break-all font-mono text-xs text-[#52736a]">{bookingId}</p> : null}
        </div>
        {bookingId ? <button type="button" onClick={onClearSelection} className="rounded-lg border border-[#d7e5df] px-3 py-2 text-sm font-semibold text-[#31594d]">{serviceBookingCopy.closeDetails}</button> : null}
      </div>

      {!bookingId ? <p className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.selectDetails}</p> : null}
      {bookingId && detailQuery.isPending ? <p role="status" className="mt-4 text-sm text-[#52736a]">{serviceBookingCopy.detailLoading}</p> : null}
      {bookingId && detailQuery.isError ? <ReadError error={detailQuery.error} fallback={serviceBookingCopy.detailError} onRetry={() => void detailQuery.refetch()} /> : null}
      {detailQuery.data ? (
        <BookingDetailsContent
          booking={detailQuery.data}
          history={detailQuery.data.history ?? historyQuery.data ?? []}
          historyLoading={historyEndpointEnabled && historyQuery.isPending}
          historyError={historyEndpointEnabled ? historyQuery.error : null}
          onRetryHistory={() => void historyQuery.refetch()}
        />
      ) : null}
    </section>
  );
}

function retryRead(failureCount: number, error: unknown): boolean {
  return !(error instanceof ServiceBookingApiError && [401, 403, 404, 422].includes(error.status)) && failureCount < 1;
}

function ReadError({ error, fallback, onRetry }: { error: unknown; fallback: string; onRetry: () => void }) {
  const message = error instanceof ServiceBookingApiError && error.status === 404
    ? serviceBookingCopy.bookingNotFound
    : error instanceof ServiceBookingApiError && [401, 403].includes(error.status)
      ? serviceBookingCopy.detailAccessDenied
      : fallback;

  return (
    <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="rounded-lg border border-[#d8a7a0] px-3 py-1.5 font-semibold">{serviceBookingCopy.retry}</button>
    </div>
  );
}

function BookingDetailsContent({
  booking,
  history,
  historyLoading,
  historyError,
  onRetryHistory,
}: {
  booking: ServiceBookingDetail;
  history: ServiceBookingHistoryItem[];
  historyLoading: boolean;
  historyError: unknown;
  onRetryHistory: () => void;
}) {
  return (
    <div className="mt-4 space-y-5">
      <DetailSection title={serviceBookingCopy.section.appointment}>
        <DetailGrid fields={[
          ["Status", formatServiceBookingEnum(booking.status)],
          ["Appointment", formatServiceBookingAppointment(booking.starts_at, booking.ends_at, booking.timezone)],
          ["Created", formatDateTime(booking.created_at)],
          ["Starts", formatDateTime(booking.starts_at, booking.timezone)],
          ["Ends", formatDateTime(booking.ends_at, booking.timezone)],
          ["Duration", `${booking.duration_minutes} minutes`],
          ["Timezone", booking.timezone],
          ["Hold expires", formatDateTime(booking.hold_expires_at)],
          ["Notes", booking.notes],
        ]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.customer}>
        <DetailGrid fields={[
          ["Name", booking.customer.name],
          ["Email", booking.customer.email],
          ["Phone", booking.customer.phone],
          ["User ID", booking.customer.user_id],
        ]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.service}>
        <DetailGrid fields={[["Service", booking.service_name], ["Service ID", booking.service_id], ["Enterprise", booking.enterprise_name || booking.enterprise_id]]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.provider}>
        <DetailGrid fields={[["Provider", booking.provider_name], ["Provider ID", booking.provider_id]]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.delivery}>
        <p className="mb-3 text-sm font-semibold text-[#06201c]">{formatServiceBookingEnum(booking.delivery_mode)}</p>
        {booking.delivery_mode === "in_person" || booking.delivery_mode === "hybrid" ? <RecordFields value={booking.venue} fields={VENUE_FIELDS} emptyLabel={serviceBookingCopy.noVenueDetails} /> : null}
        {booking.delivery_mode === "virtual" || booking.delivery_mode === "hybrid" ? <RecordFields value={booking.meeting} fields={MEETING_FIELDS} emptyLabel={serviceBookingCopy.noMeetingDetails} /> : null}
        <DetailGrid className="mt-3" fields={[["Can join", booking.can_join ? serviceBookingCopy.yes : serviceBookingCopy.no], ["Join restriction", booking.join_blocked_reason]]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.capacity}>
        <DetailGrid fields={[["Participants", String(booking.participants)]]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.payment}>
        <DetailGrid fields={[["Amount", String(booking.amount)], ["Currency", booking.currency], ["Payment status", formatServiceBookingEnum(booking.payment_status)], ["Payment ID", booking.payment_id]]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.cancellation}>
        <DetailGrid fields={[
          ["Can cancel", booking.can_cancel ? serviceBookingCopy.yes : serviceBookingCopy.no],
          ["Cancel mode", booking.cancel_mode ? formatServiceBookingEnum(booking.cancel_mode) : null],
          ["Restriction", booking.cancel_blocked_reason],
          ["Policy summary", booking.cancellation_policy_summary],
          ["Policy", booking.cancellation_policy],
        ]} />
        <RecordFields value={booking.cancellation} fields={Object.keys(booking.cancellation)} emptyLabel={serviceBookingCopy.noValue} className="mt-3" />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.status}>
        <DetailGrid fields={[
          ["Allowed statuses", booking.allowed_statuses?.map(formatServiceBookingEnum).join(", ")],
          ["Created by", booking.created_by_role ? formatServiceBookingEnum(booking.created_by_role) : null],
          ["Can reschedule", booking.can_reschedule ? serviceBookingCopy.yes : serviceBookingCopy.no],
          ["Can check in", booking.can_check_in ? serviceBookingCopy.yes : serviceBookingCopy.no],
        ]} />
      </DetailSection>

      <DetailSection title={serviceBookingCopy.section.activity}>
        {historyLoading ? <p role="status" className="text-sm text-[#52736a]">{serviceBookingCopy.historyLoading}</p> : null}
        {historyError ? <ReadError error={historyError} fallback={serviceBookingCopy.historyError} onRetry={onRetryHistory} /> : null}
        {!historyLoading && !historyError && history.length === 0 ? <p className="text-sm text-[#52736a]">{serviceBookingCopy.noHistory}</p> : null}
        {!historyLoading && !historyError && history.length > 0 ? <HistoryList history={history} /> : null}
      </DetailSection>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4"><h4 className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">{title}</h4><div className="mt-3">{children}</div></section>;
}

function DetailGrid({ fields, className = "" }: { fields: readonly [string, string | number | null | undefined][]; className?: string }) {
  return <dl className={`grid gap-x-4 gap-y-3 sm:grid-cols-2 ${className}`}>{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold text-[#52736a]">{label}</dt><dd className="mt-1 break-words text-sm text-[#06201c]">{value === null || value === undefined || value === "" ? serviceBookingCopy.noValue : String(value)}</dd></div>)}</dl>;
}

function RecordFields({ value, fields, emptyLabel, className = "" }: { value: Record<string, unknown> | null; fields: readonly string[]; emptyLabel: string; className?: string }) {
  const displayFields = fields.flatMap((key) => {
    const fieldValue = value?.[key];
    if (typeof fieldValue !== "string" && typeof fieldValue !== "number" && typeof fieldValue !== "boolean") return [];
    const displayValue = typeof fieldValue === "boolean"
      ? fieldValue ? serviceBookingCopy.yes : serviceBookingCopy.no
      : fieldValue;
    return [[formatServiceBookingEnum(key), displayValue === "" ? serviceBookingCopy.noValue : displayValue] as [string, string | number]];
  });

  return displayFields.length > 0 ? <DetailGrid fields={displayFields} className={className} /> : <p className={`text-sm text-[#52736a] ${className}`}>{emptyLabel}</p>;
}

function HistoryList({ history }: { history: ServiceBookingHistoryItem[] }) {
  return <ol className="space-y-3">{history.map((entry, index) => <li key={`${entry.at ?? "entry"}-${index}`} className="rounded-xl border border-[#e1ebe6] bg-white p-3"><p className="text-sm font-semibold text-[#06201c]">{formatServiceBookingEnum(entry.action)}</p><DetailGrid fields={[["From", entry.from_status ? formatServiceBookingEnum(entry.from_status) : null], ["To", entry.to_status ? formatServiceBookingEnum(entry.to_status) : null], ["Actor", entry.actor_name || entry.actor_role], ["When", formatDateTime(entry.at)], ["Reason", entry.reason]]} className="mt-2" /></li>)}</ol>;
}

function formatDateTime(value: string | null | undefined, timeZone?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", ...(timeZone ? { timeZone } : {}) }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
