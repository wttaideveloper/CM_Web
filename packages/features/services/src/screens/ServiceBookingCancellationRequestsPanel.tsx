"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { formatServiceBookingAppointment, formatServiceBookingEnum } from "../service-booking-management";
import {
  enterpriseServiceBookingCancellationRequestsQueryKey,
  getEnterpriseServiceBookingCancellationRequests,
  ServiceBookingApiError,
} from "../service-booking.service";
import { serviceBookingCopy } from "../service-booking-copy.en";
import { ServiceBookingCancellationDecisionControls } from "./ServiceBookingCancellationDecisionControls";

const PAGE_SIZE = 10;

type ServiceBookingCancellationRequestsPanelProps = {
  enterpriseId: string;
  onOpenBooking: (bookingId: string) => void;
};

export function ServiceBookingCancellationRequestsPanel({ enterpriseId, onOpenBooking }: ServiceBookingCancellationRequestsPanelProps) {
  const [page, setPage] = useState(1);
  const request = useMemo(() => ({ enterpriseId, page, pageSize: PAGE_SIZE }), [enterpriseId, page]);

  const query = useQuery({
    queryKey: enterpriseServiceBookingCancellationRequestsQueryKey(request),
    queryFn: ({ signal }) => getEnterpriseServiceBookingCancellationRequests(request, signal),
    enabled: Boolean(enterpriseId),
    staleTime: 15_000,
    retry: (failureCount, error) => !(error instanceof ServiceBookingApiError && [401, 403, 404, 422].includes(error.status)) && failureCount < 1,
  });
  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const currentPage = data?.page ?? page;
  return (
    <section id="service-booking-cancellation-requests" className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="service-booking-cancellation-requests-title">
      <div className="border-b border-[#edf3f0] px-5 py-4">
        <h3 id="service-booking-cancellation-requests-title" className="text-base font-bold text-[#06201c]">{serviceBookingCopy.cancellationRequestsTitle}</h3>
        <p className="mt-1 text-sm text-[#52736a]">{serviceBookingCopy.cancellationRequestsDescription}</p>
        <p className="mt-4 text-xs text-[#7f9d94]">{serviceBookingCopy.cancellationRequestsPaginationOnly}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm" aria-busy={query.isFetching}>
          <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]"><tr>{[
            ["booking", serviceBookingCopy.columns.reference],
            ["customer", serviceBookingCopy.columns.customer],
            ["service", serviceBookingCopy.columns.service],
            ["provider", serviceBookingCopy.columns.provider],
            ["appointment", serviceBookingCopy.columns.dateTime],
            ["reason", serviceBookingCopy.cancellationReason],
            ["requested", serviceBookingCopy.requestedAt],
            ["status", serviceBookingCopy.columns.bookingStatus],
            ["payment", serviceBookingCopy.columns.paymentStatus],
            ["details", serviceBookingCopy.columns.details],
            ["actions", serviceBookingCopy.actionsTitle],
          ].map(([key, label]) => <th key={key} scope="col" className="px-4 py-3 font-bold">{label}</th>)}</tr></thead>
          <tbody>
            {query.isPending ? <tr><td colSpan={11} className="px-5 py-12 text-center"><span role="status" className="text-sm text-[#52736a]">{serviceBookingCopy.loadingCancellationRequests}</span></td></tr> : null}
            {query.isError ? <tr><td colSpan={11} className="px-5 py-12 text-center"><div role="alert" className="mx-auto max-w-lg rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]"><p>{serviceBookingCopy.cancellationRequestsError}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 rounded-lg border border-[#d8a7a0] px-3 py-1.5 font-semibold">{serviceBookingCopy.retry}</button></div></td></tr> : null}
            {data && data.items.length === 0 ? <tr><td colSpan={11} className="px-5 py-12 text-center"><p className="text-base font-bold text-[#06201c]">{serviceBookingCopy.emptyCancellationRequestsTitle}</p><p className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.emptyCancellationRequestsDescription}</p></td></tr> : null}
            {data?.items.map((requestItem) => <tr key={requestItem.id} className="border-t border-[#edf3f0] align-top">
              <td className="max-w-[190px] break-all px-4 py-4 font-mono text-xs text-[#31594d]">{requestItem.booking_id}</td>
              <td className="px-4 py-4 text-[#06201c]">{requestItem.customer.name || requestItem.customer.email || requestItem.customer.user_id || serviceBookingCopy.noValue}</td>
              <td className="px-4 py-4 text-[#06201c]">{requestItem.service_name}</td>
              <td className="px-4 py-4 text-[#06201c]">{requestItem.provider_name || requestItem.provider_id || serviceBookingCopy.noValue}</td>
              <td className="whitespace-nowrap px-4 py-4 text-[#06201c]">{formatServiceBookingAppointment(requestItem.starts_at, requestItem.ends_at, requestItem.timezone)}</td>
              <td className="max-w-[220px] break-words px-4 py-4 text-[#06201c]">{requestItem.reason || serviceBookingCopy.noValue}</td>
              <td className="whitespace-nowrap px-4 py-4 text-[#06201c]">{formatDateTime(requestItem.requested_at, requestItem.timezone)}</td>
              <td className="px-4 py-4 text-[#06201c]">{formatServiceBookingEnum(requestItem.booking_status)}</td>
              <td className="px-4 py-4 text-[#06201c]">{formatServiceBookingEnum(requestItem.payment_status)}{requestItem.refund_status ? <span className="block text-xs text-[#52736a]">Refund: {formatServiceBookingEnum(requestItem.refund_status)}</span> : null}</td>
              <td className="px-4 py-4"><button type="button" onClick={() => onOpenBooking(requestItem.booking_id)} className="font-semibold text-[#1f6a58] underline">{serviceBookingCopy.viewDetails}</button></td>
              <td className="px-4 py-4"><ServiceBookingCancellationDecisionControls request={requestItem} onOpenBooking={() => onOpenBooking(requestItem.booking_id)} /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#edf3f0] px-5 py-3">
        <span className="text-sm text-[#52736a]" role="status">{data ? `${serviceBookingCopy.pageLabel.replace("{{page}}", String(currentPage))} · ${data.total} ${serviceBookingCopy.requestsWord}` : query.isFetching ? serviceBookingCopy.loading : ""}</span>
        <div className="flex gap-2"><button type="button" disabled={currentPage <= 1 || query.isFetching || !data} onClick={() => setPage((value) => Math.max(1, value - 1))} className="h-9 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-60">{serviceBookingCopy.previous}</button><button type="button" disabled={currentPage >= totalPages || query.isFetching || !data} onClick={() => setPage((value) => value + 1)} className="h-9 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-60">{serviceBookingCopy.next}</button></div>
      </div>
    </section>
  );
}

function formatDateTime(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
