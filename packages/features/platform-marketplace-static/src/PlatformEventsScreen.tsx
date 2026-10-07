"use client";

import { protectedMediaPreviewUrl } from "@ihp/shared";
import { getPlatformEnterpriseById } from "@ihp/platform-enterprises";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import PublishedEventDetailsModal from "./PublishedEventDetailsModal";
import { getPublishedEvents, locationLines, nonEmpty, participantCapacity, temporalLabel, temporalState, type EventItem, type TemporalFilter } from "./platform-events.service";

/** Renders the real, read-only catalogue of currently published Events. */
export default function PlatformEventsScreen() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return <QueryClientProvider client={client}><PublishedEvents /></QueryClientProvider>;
}

function PublishedEvents() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TemporalFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(input.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [input]);
  const eventsQuery = useQuery({ queryKey: ["platform", "published-events", page, search], queryFn: () => getPublishedEvents(page, search) });
  const visible = (eventsQuery.data?.items ?? []).filter((event) => filter === "all" || temporalState(event) === filter);
  const emptyTitle = filter === "all" ? "No published events" : "No " + filter + " events";
  const openDetails = (eventId: string, trigger: HTMLElement) => { triggerRef.current = trigger; setSelectedEventId(eventId); };
  const closeDetails = () => { setSelectedEventId(null); const trigger = triggerRef.current; window.setTimeout(() => trigger?.focus(), 0); };

  return <>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold text-[#06201c]">Event Management</h2><p className="mt-1 text-sm text-[#52736a]">Browse published events across all enterprises.</p></div></div>
    <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><label className="w-full lg:max-w-sm"><span className="sr-only">Search published events and enterprises</span><input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search events or enterprises..." className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label><div className="flex flex-wrap gap-2">{(["all", "upcoming", "ongoing", "finished"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={filter === item ? "h-10 rounded-full bg-[#e8f6ee] px-4 text-sm font-semibold text-[#1f6a58]" : "h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a]"}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div></div>
    {eventsQuery.isLoading ? <div role="status" className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[290px] animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div> : eventsQuery.isError ? <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">{eventsQuery.error instanceof Error ? eventsQuery.error.message : "Unable to load published events."}</p><button type="button" onClick={() => void eventsQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : visible.length === 0 ? <div className="mt-5 rounded-2xl bg-white p-10 text-center shadow-sm"><p className="font-bold">{emptyTitle}</p><p className="mt-2 text-sm text-[#52736a]">{filter === "all" ? "Published events will appear here once they have been approved and published." : "Try another temporal filter."}</p></div> : <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((event) => <PublishedEventCard key={event.id} event={event} onOpen={(trigger) => openDetails(event.id, trigger)} />)}</div>}
    {eventsQuery.data && eventsQuery.data.pagination.total_pages > 1 ? <nav aria-label="Published Event pages" className="mt-6 flex justify-between"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {eventsQuery.data.pagination.page} of {eventsQuery.data.pagination.total_pages}</span><button type="button" disabled={page >= eventsQuery.data.pagination.total_pages} onClick={() => setPage((current) => current + 1)}>Next</button></nav> : null}
    {selectedEventId ? <PublishedEventDetailsModal eventId={selectedEventId} onClose={closeDetails} /> : null}
  </>;
}

function PublishedEventCard({ event, onOpen }: { event: EventItem; onOpen: (trigger: HTMLElement) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const state = temporalState(event);
  const image = event.primary_image?.trim();
  const organiser = nonEmpty(event.organiser_name);
  const capacity = participantCapacity(event.capacity);
  const venueLines = locationLines(event);
  const open = (trigger: HTMLElement) => onOpen(trigger);
  return <article role="button" tabIndex={0} aria-label={`View details for ${event.title}`} onClick={(clickEvent) => open(clickEvent.currentTarget)} onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter" || keyEvent.key === " ") { keyEvent.preventDefault(); open(keyEvent.currentTarget); } }} className="group overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm outline-none transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-[#4f9f76] hover:shadow-lg focus-visible:border-[#1f6a58] focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">
    <div className="relative h-[180px] bg-gradient-to-br from-[#1f6a58] via-[#37836c] to-[#8ac7a7] p-5 text-white">{image && !imageFailed ? <><img src={protectedMediaPreviewUrl(image, "/api/platform-super-admin/event-media")} alt="" aria-hidden="true" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]" /><div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#06201c]/78 via-[#0c382e]/68 to-[#1f6a58]/55" /></> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.26)_0_1px,transparent_1px)] bg-[length:28px_28px]" />}<span className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">{temporalLabel(state)}</span><div className="absolute bottom-5 left-5 right-5"><p className="text-sm font-bold text-white/80">{dateLabel(event.start_date)}</p><h3 className="mt-1 text-xl font-bold leading-tight">{event.title}</h3></div></div><div className="space-y-3 p-5 text-sm text-[#52736a]"><PublishedEnterpriseName enterpriseId={event.enterprise_id} fallback={event.enterprise_name} />{organiser ? <p><span className="font-semibold text-[#31594d]">Organiser: </span>{organiser}</p> : null}<div><p className="font-medium text-[#31594d]">{venueLines[0]}</p>{venueLines.slice(1).map((line) => <p key={line} className="mt-0.5">{line}</p>)}</div>{capacity !== null ? <p><span className="font-semibold text-[#31594d]">Capacity: </span>{capacity}</p> : null}</div>
  </article>;
}

function PublishedEnterpriseName({ enterpriseId, fallback }: { enterpriseId: string; fallback?: string | null }) {
  const enterpriseQuery = useQuery({ queryKey: ["platform", "published-event-enterprise", enterpriseId], queryFn: () => getPlatformEnterpriseById(enterpriseId), enabled: Boolean(enterpriseId), staleTime: 5 * 60_000, retry: 1 });
  const resolvedName = enterpriseQuery.data?.business_legal_name || enterpriseQuery.data?.business_short_name || enterpriseQuery.data?.name || nonEmpty(fallback);
  return <p className="font-semibold text-[#31594d]">{resolvedName || (enterpriseQuery.isPending ? "Loading enterprise..." : "Enterprise information unavailable")}</p>;
}

function dateLabel(value: string | null | undefined): string {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))) : "Date unavailable";
}
