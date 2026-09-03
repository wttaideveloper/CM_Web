"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";

import EventActionsMenu from "./EventActionsMenu";
import EventTemplatesDialog from "./EventTemplatesDialog";
import { PRODUCT_EVENT_STATUSES, getEventStatusBadgeClass, getEventStatusLabel } from "./event-status";
import { listEvents, type Event } from "./events.service";

type SortOption = "newest" | "oldest" | "az" | "status";
const statusFilters = ["all", ...PRODUCT_EVENT_STATUSES] as const;
type StatusFilter = (typeof statusFilters)[number];
const EVENTS_PAGE_SIZE = 20;

function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value));
}

function sortEvents(items: Event[], sort: SortOption) {
  return [...items].sort((left, right) => {
    if (sort === "az") {
      return left.title.localeCompare(right.title);
    }

    if (sort === "status") {
      return left.status.localeCompare(right.status) || left.title.localeCompare(right.title);
    }

    const leftValid = isValidDate(left.created_at);
    const rightValid = isValidDate(right.created_at);

    if (leftValid && rightValid) {
      return sort === "oldest"
        ? Date.parse(left.created_at) - Date.parse(right.created_at)
        : Date.parse(right.created_at) - Date.parse(left.created_at);
    }

    if (leftValid) {
      return -1;
    }

    if (rightValid) {
      return 1;
    }

    return 0;
  });
}

function formatEventDate(value: string): string {
  if (!isValidDate(value)) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function formatSeatAvailability(event: Event): string {
  if (event.is_full === true) return "Full";
  if (typeof event.available_seats === "number") {
    return `${event.available_seats} ${event.available_seats === 1 ? "seat" : "seats"} left`;
  }
  return "—";
}

function EventCard({ event, onStatusSuccess, onDuplicateSuccess, onDeleteSuccess }: { event: Event; onStatusSuccess: () => void; onDuplicateSuccess: () => void; onDeleteSuccess: () => void }) {
  const primaryImage = event.primary_image?.trim() ?? "";
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasPrimaryImage = primaryImage.length > 0 && failedImageUrl !== primaryImage;

  useEffect(() => {
    if (!primaryImage) {
      setFailedImageUrl(null);
      return;
    }

    const image = new Image();
    image.onerror = () => setFailedImageUrl(primaryImage);
    image.src = primaryImage;

    return () => {
      image.onerror = null;
    };
  }, [primaryImage]);
  const labelClass = hasPrimaryImage ? "text-white/75" : "text-[#7f9d94]";
  const primaryTextClass = hasPrimaryImage ? "text-white" : "text-[#06201c]";
  const secondaryTextClass = hasPrimaryImage ? "text-white/85" : "text-[#52736a]";
  const dividerClass = hasPrimaryImage ? "border-white/25" : "border-[#edf3f0]";
  const interactionClass = hasPrimaryImage
    ? "hover:-translate-y-0.5 hover:border-[#4f9f76] hover:shadow-lg focus-within:border-[#1f6a58] focus-within:ring-2 focus-within:ring-[#1f6a58]/20"
    : "hover:-translate-y-0.5 hover:border-[#4f9f76] hover:bg-[#edf8f1] hover:shadow-lg focus-within:border-[#1f6a58] focus-within:bg-[#f4faf7] focus-within:ring-2 focus-within:ring-[#1f6a58]/20";

  return (
    <article className={`group relative rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 ${interactionClass}`}>
      {hasPrimaryImage ? <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[inherit] bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(primaryImage)})` }}><div className="absolute inset-0 bg-gradient-to-br from-[#06201c]/60 via-[#0c382e]/48 to-[#1f6a58]/38" /></div> : null}
      <div className="relative z-10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-[0.12em] ${labelClass}`}>
            {event.category || "—"}
          </p>
          <h3 className={`mt-2 text-lg font-bold ${primaryTextClass}`}>{event.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${getEventStatusBadgeClass(event.status)}`}>{getEventStatusLabel(event.status)}</span><div className={hasPrimaryImage ? "rounded-full bg-white/90 shadow-sm" : undefined}><EventActionsMenu event={event} onStatusSuccess={onStatusSuccess} onDuplicateSuccess={onDuplicateSuccess} onDeleteSuccess={onDeleteSuccess} /></div></div>
      </div>

      <p className={`mt-2 line-clamp-2 min-h-10 text-sm leading-5 ${secondaryTextClass}`}>{event.description || "—"}</p>

      <div className={`mt-3 grid grid-cols-1 gap-x-8 gap-y-4 border-t pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4 ${dividerClass}`}>
        <div className="min-w-0">
          <p className={`whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] ${labelClass}`}>Date</p>
          <p className={`mt-1 font-semibold ${primaryTextClass}`}>{formatEventDate(event.start_date)}</p>
        </div>
        <div className="min-w-0">
          <p className={`whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] ${labelClass}`}>Location</p>
          <p className={`mt-1 font-semibold ${primaryTextClass}`}>{event.delivery_mode || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className={`whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] ${labelClass}`}>Registrations</p>
          <p className={`mt-1 font-semibold ${primaryTextClass}`}>—</p>
        </div>
        <div className="min-w-0">
          <p className={`whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] ${labelClass}`}>Availability</p>
          <p className={`mt-1 font-semibold ${primaryTextClass}`}>{formatSeatAvailability(event)}</p>
        </div>
      </div>

      <Link href={`/admin/events/${event.id}`} className={`mt-3 block border-t pt-3 text-sm font-semibold outline-none transition-colors hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 ${hasPrimaryImage ? "border-white/25 text-white hover:text-white focus-visible:ring-white focus-visible:ring-offset-[#1f6a58]" : "border-[#edf3f0] text-[#1f6a58] hover:text-[#195646] focus-visible:ring-[#1f6a58]"}`}>
        View event details
      </Link>
      </div>
    </article>
  );
}

/** Renders the authenticated enterprise's paginated Events list. */
export default function EnterpriseEventsScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const eventsQuery = useQuery({
    queryKey: ["events", "list", tenantId, enterpriseId, debouncedQuery, statusFilter, page, EVENTS_PAGE_SIZE],
    queryFn: () =>
      listEvents({
        tenant_id: tenantId ?? undefined,
        enterprise_id: enterpriseId ?? undefined,
        search: debouncedQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        page_size: EVENTS_PAGE_SIZE,
      }),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const visibleEvents = useMemo(() => {
    return sortEvents(eventsQuery.data?.items ?? [], sort);
  }, [eventsQuery.data?.items, sort]);
  const pagination = eventsQuery.data?.pagination;

  const showStatusFeedback = () => setStatusFeedback("Event status updated.");
  const showDuplicateFeedback = () => setStatusFeedback("Event duplicated.");
  const showDeleteFeedback = () => setStatusFeedback("Event deleted.");

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
            ADMIN PORTAL
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">Events</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a] sm:text-base">
            Manage events hosted by your enterprise.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsTemplatesOpen(true)}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#b9d6cb] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm transition hover:bg-[#f4faf7]"
          >
            Templates
          </button>
          {enterpriseId ? (
            <Link
              href="/admin/events/create"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#195646]"
            >
              + Create Event
            </Link>
          ) : (
            <div>
              <button
                type="button"
                disabled
                aria-describedby="events-create-enterprise-note"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm opacity-60 disabled:cursor-not-allowed"
              >
                + Create Event
              </button>
              <p id="events-create-enterprise-note" className="mt-2 max-w-xs text-xs text-[#52736a]">
                Creating an Event requires a linked Enterprise under the current backend contract.
              </p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-[#b9d6cb] bg-[#f4faf7] p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, description, or category"
              className="mt-2 h-12 w-full rounded-2xl border border-[#8fc9a8] bg-[#e8f6ee] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#52736a] focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            />
          </label>

          <label className="block xl:w-[220px]">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
              Sort
            </span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#b9d6cb] bg-white px-4 text-sm text-[#06201c] outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">A-Z</option>
              <option value="status">Status</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusFilters.map((chip) => {
            const active = statusFilter === chip;

            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setStatusFilter(chip);
                  setPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#e8f6ee] text-[#1f6a58]"
                    : "border border-[#d7e5df] bg-white text-[#52736a] hover:bg-[#f4faf7]"
                }`}
              >
                {chip === "all" ? "All" : getEventStatusLabel(chip)}
              </button>
            );
          })}
        </div>
      </section>

      {statusFeedback ? <p role="status" className="mt-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{statusFeedback}</p> : null}
      {isTemplatesOpen ? <EventTemplatesDialog events={eventsQuery.data?.items ?? []} tenantId={tenantId} enterpriseId={enterpriseId} onClose={() => setIsTemplatesOpen(false)} /> : null}

      {eventsQuery.isLoading ? (
        <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading events...</p>
        </section>
      ) : eventsQuery.isError ? (
        <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load events.</p>
          <button
            type="button"
            onClick={() => void eventsQuery.refetch()}
            className="mt-3 text-sm font-semibold text-[#1f6a58] underline"
          >
            Try again
          </button>
        </section>
      ) : !pagination || visibleEvents.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">No events found.</p>
          <p className="mt-2 text-sm text-[#52736a]">Try a different search or filter.</p>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2" aria-busy={eventsQuery.isFetching}>
            {visibleEvents.map((event) => (
              <EventCard key={event.id} event={event} onStatusSuccess={showStatusFeedback} onDuplicateSuccess={showDuplicateFeedback} onDeleteSuccess={showDeleteFeedback} />
            ))}
          </section>
          <EventPagination
            currentPage={pagination.page}
            isChangingPage={eventsQuery.isPlaceholderData}
            onNext={() => setPage((currentPage) => currentPage + 1)}
            onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            totalPages={pagination.total_pages}
          />
        </>
      )}
    </div>
  );
}

/** Renders numeric-page navigation from the Events list response metadata. */
function EventPagination({ currentPage, isChangingPage, onNext, onPrevious, totalPages }: { currentPage: number; isChangingPage: boolean; onNext: () => void; onPrevious: () => void; totalPages: number }) {
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  return <nav aria-label="Events pagination" className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><p aria-live="polite" className="text-sm font-semibold text-[#52736a]">Page {currentPage} of {totalPages}</p><div className="flex gap-3"><button type="button" onClick={onPrevious} disabled={!hasPreviousPage || isChangingPage} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] transition hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">Previous</button><button type="button" onClick={onNext} disabled={!hasNextPage || isChangingPage} className="h-10 rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-50">Next</button></div></nav>;
}
