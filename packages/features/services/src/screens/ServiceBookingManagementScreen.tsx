"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  formatServiceBookingEnum,
  formatServiceBookingAppointment,
  getServiceBookingPageSummary,
  getServiceBookingStatusLabel,
  serviceBookingColumnKeys,
  serviceBookingStatusFilters,
  type ServiceBookingStatusFilter,
} from "../service-booking-management";
import {
  enterpriseServiceBookingsQueryKey,
  getEnterpriseServiceBookings,
  SERVICE_BOOKING_PAGE_SIZE,
  ServiceBookingApiError,
  type ServiceBookingListItem,
} from "../service-booking.service";
import { serviceBookingCopy } from "../service-booking-copy.en";
import { ServiceBookingActionControls } from "./ServiceBookingActionControls";
import { ServiceBookingDetailsPanel } from "./ServiceBookingDetailsPanel";
import ServiceBookingOperationsPanel from "./ServiceBookingOperationsPanel";

const SEARCH_DEBOUNCE_MS = 300;

type ServiceBookingManagementScreenProps = {
  enterpriseId: string;
  enterpriseName?: string;
};

/** Renders the Enterprise-scoped, read-only Service Booking list. */
export default function ServiceBookingManagementScreen({
  enterpriseId,
  enterpriseName,
}: ServiceBookingManagementScreenProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceBookingStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const request = useMemo(
    () => ({
      enterpriseId,
      search: debouncedSearch,
      statusFilter,
      page,
      pageSize: SERVICE_BOOKING_PAGE_SIZE,
    }),
    [debouncedSearch, enterpriseId, page, statusFilter],
  );

  const bookingsQuery = useQuery({
    queryKey: enterpriseServiceBookingsQueryKey(request),
    queryFn: ({ signal }) => getEnterpriseServiceBookings(request, signal),
    enabled: Boolean(enterpriseId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) =>
      !(error instanceof ServiceBookingApiError && [401, 403, 404, 422].includes(error.status)) && failureCount < 1,
  });

  const hasFilters = search.trim().length > 0 || statusFilter !== "all";
  const data = bookingsQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const currentPage = data?.page ?? page;

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setSelectedBookingId(null);
  };

  const updateStatusFilter = (value: ServiceBookingStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedBookingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7f9d94]">Services</p>
          <h2 className="text-2xl font-bold text-[#06201c]">{serviceBookingCopy.title}</h2>
          <p className="mt-1 text-sm text-[#52736a]">{serviceBookingCopy.subtitle}</p>
        </div>
        {enterpriseName ? <p className="text-sm font-semibold text-[#52736a]">{enterpriseName}</p> : null}
      </div>

      <section className="rounded-2xl border border-[#e8d9a8] bg-[#fffaf0] p-4" role="status">
        <p className="text-sm font-bold text-[#805900]">{serviceBookingCopy.integrationPending}</p>
      </section>

      <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-label="Booking filters">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="block w-full lg:max-w-md">
            <span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.searchLabel}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder={serviceBookingCopy.searchPlaceholder}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
            />
          </label>
          <label className="block w-full lg:max-w-xs">
            <span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.statusLabel}</span>
            <select
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value as ServiceBookingStatusFilter)}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
            >
              {serviceBookingStatusFilters.map((filter) => (
                <option key={filter} value={filter}>{getServiceBookingStatusLabel(filter)}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-[#7f9d94]">
          {hasFilters ? serviceBookingCopy.filtersApplied : serviceBookingCopy.filtersConnected}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="service-booking-table-title">
        <div className="flex flex-col gap-2 border-b border-[#edf3f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 id="service-booking-table-title" className="text-base font-bold text-[#06201c]">Bookings</h3>
          <span className="text-sm text-[#52736a]">
            {data
              ? `${getServiceBookingPageSummary(currentPage, data.total, data.page_size)} · ${serviceBookingCopy.recordsTotal.replace("{{total}}", String(data.total))}`
              : bookingsQuery.isError ? serviceBookingCopy.loadError : serviceBookingCopy.loading}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm" aria-busy={bookingsQuery.isFetching}>
            <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]">
              <tr>
                {serviceBookingColumnKeys.map((column) => <th key={column} className="px-4 py-3 font-bold">{serviceBookingCopy.columns[column]}</th>)}
              </tr>
            </thead>
            <tbody>
              {bookingsQuery.isPending ? <LoadingRows /> : null}
              {bookingsQuery.isError ? (
                <tr>
                  <td colSpan={serviceBookingColumnKeys.length} className="px-5 py-14 text-center">
                    <div role="alert" className="mx-auto max-w-lg rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]">
                      <p>{serviceBookingCopy.loadError}</p>
                      <button type="button" onClick={() => void bookingsQuery.refetch()} className="mt-3 rounded-lg border border-[#d8a7a0] px-3 py-1.5 font-semibold">
                        {serviceBookingCopy.retry}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={serviceBookingColumnKeys.length} className="px-5 py-14 text-center">
                    <p className="text-base font-bold text-[#06201c]">
                      {hasFilters ? serviceBookingCopy.filteredEmptyTitle : serviceBookingCopy.emptyTitle}
                    </p>
                    <p className="mt-2 text-sm text-[#52736a]">
                      {hasFilters ? serviceBookingCopy.filteredEmptyDescription : serviceBookingCopy.emptyDescription}
                    </p>
                  </td>
                </tr>
              ) : null}
              {data?.items.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  isSelected={selectedBookingId === booking.id}
                  onSelect={() => setSelectedBookingId(booking.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#edf3f0] px-5 py-3">
          <span className="text-sm text-[#52736a]" role="status">
            {bookingsQuery.isFetching && !bookingsQuery.isPending ? serviceBookingCopy.loading : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || bookingsQuery.isFetching || !data}
              onClick={() => {
                setSelectedBookingId(null);
                setPage((current) => Math.max(1, current - 1));
              }}
              className="h-9 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] opacity-60 disabled:cursor-not-allowed"
            >
              {serviceBookingCopy.previous}
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || bookingsQuery.isFetching || !data}
              onClick={() => {
                setSelectedBookingId(null);
                setPage((current) => current + 1);
              }}
              className="h-9 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] opacity-60 disabled:cursor-not-allowed"
            >
              {serviceBookingCopy.next}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="xl:col-span-2">
          <ServiceBookingOperationsPanel
            enterpriseId={enterpriseId}
            onBookingCreated={(bookingId) => setSelectedBookingId(bookingId)}
          />
        </div>
        <ServiceBookingDetailsPanel
          bookingId={selectedBookingId}
          onClearSelection={() => setSelectedBookingId(null)}
        />
        <ServiceBookingActionControls />
      </div>
    </div>
  );
}
function LoadingRows() {
  return <tr><td colSpan={serviceBookingColumnKeys.length} className="px-5 py-14 text-center"><span role="status" className="text-sm text-[#52736a]">{serviceBookingCopy.loading}</span></td></tr>;
}
function BookingRow({
  booking,
  isSelected,
  onSelect,
}: {
  booking: ServiceBookingListItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr className={`border-t border-[#edf3f0] align-top ${isSelected ? "bg-[#f4faf7]" : ""}`}>
      <td className="max-w-[190px] break-all px-4 py-4 font-mono text-xs text-[#31594d]">{booking.id}</td>
      <td className="px-4 py-4 text-[#06201c]">{booking.customer.name || booking.customer.email || booking.customer.user_id || serviceBookingCopy.noValue}</td>
      <td className="px-4 py-4 text-[#06201c]">{booking.service_name}</td>
      <td className="px-4 py-4 text-[#06201c]">{booking.provider_name || booking.provider_id || serviceBookingCopy.noValue}</td>
      <td className="whitespace-nowrap px-4 py-4 text-[#06201c]">{formatServiceBookingAppointment(booking.starts_at, booking.ends_at, booking.timezone)}</td>
      <td className="px-4 py-4 text-[#06201c]">{formatServiceBookingEnum(booking.delivery_mode)}</td>
      <td className="px-4 py-4 text-[#06201c]">{formatServiceBookingEnum(booking.status)}</td>
      <td className="px-4 py-4 text-[#06201c]">{formatServiceBookingEnum(booking.payment_status)}</td>
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={onSelect}
          className="font-semibold text-[#1f6a58] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"
        >
          {serviceBookingCopy.viewDetails}
        </button>
      </td>
    </tr>
  );
}
