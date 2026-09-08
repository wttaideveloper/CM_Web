"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type TemporalFilter = "all" | "upcoming" | "ongoing" | "finished";
type EventItem = { id: string; enterprise_id: string; enterprise_name?: string | null; title: string; category: string; organiser_name?: string | null; start_date?: string | null; end_date?: string | null; time_zone?: string | null; primary_image?: string | null; delivery_mode?: string | null; venue?: { name?: string | null; address?: string | null; city?: string | null } | null; capacity?: string | null; status: "published" };
type EventsResponse = { items: EventItem[]; pagination: { total: number; page: number; page_size: number; total_pages: number } };

class PlatformEventsApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "PlatformEventsApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function parseEvents(value: unknown): EventsResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination) || typeof value.pagination.total !== "number" || typeof value.pagination.page !== "number" || typeof value.pagination.page_size !== "number" || typeof value.pagination.total_pages !== "number" || !value.items.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.enterprise_id === "string" && typeof item.title === "string" && typeof item.category === "string" && item.status === "published")) throw new Error();
  return value as EventsResponse;
}
async function getPublishedEvents(page: number, search: string): Promise<EventsResponse> {
  const query = new URLSearchParams({ status: "published", page: String(page), page_size: "20" });
  if (search) query.set("search", search);
  const response = await fetch("/api/platform-super-admin/events?" + query.toString(), { credentials: "include" });
  if (!response.ok) throw await createPlatformEventsApiError(response);
  return parseEvents(await response.json());
}
async function createPlatformEventsApiError(response: Response): Promise<PlatformEventsApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401) return new PlatformEventsApiError(401, "Super Admin authentication is required.");
  if (response.status === 403) return new PlatformEventsApiError(403, "You do not have permission to manage Events.");
  const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : null;
  return new PlatformEventsApiError(response.status, detail ?? "Unable to load published events.");
}
function dateLabel(value: string | null | undefined): string {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))) : "Date unavailable";
}
function dateTuple(value: string | null | undefined): string | null {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value);
  return match ? [match[1], match[2], match[3], match[4] ?? "00", match[5] ?? "00", match[6] ?? "00"].join("") : null;
}
function currentTuple(timeZone: string | null | undefined): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || undefined, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "00";
  return part("year") + part("month") + part("day") + part("hour") + part("minute") + part("second");
}
function temporalState(event: EventItem): Exclude<TemporalFilter, "all"> {
  const now = currentTuple(event.time_zone);
  const start = dateTuple(event.start_date);
  const end = dateTuple(event.end_date);
  if (!start || now < start) return "upcoming";
  if (end && now > end) return "finished";
  return "ongoing";
}
function temporalLabel(state: Exclude<TemporalFilter, "all">): string { return state[0].toUpperCase() + state.slice(1); }
function nonEmpty(value: string | null | undefined): string | null { const trimmed = value?.trim(); return trimmed || null; }
function locationLines(event: EventItem): string[] {
  const deliveryMode = event.delivery_mode?.toLowerCase();
  if (deliveryMode === "virtual" || deliveryMode === "online") return ["Virtual Event"];
  const name = nonEmpty(event.venue?.name);
  const address = nonEmpty(event.venue?.address);
  const city = nonEmpty(event.venue?.city);
  const detail = [address, city].filter((part): part is string => part !== null).join(", ");
  const lines = [name, detail].filter((part): part is string => part !== null && part !== "");
  if (deliveryMode === "hybrid") return lines.length > 0 ? [lines[0] + " · Hybrid", ...lines.slice(1)] : ["Hybrid Event"];
  return lines.length > 0 ? lines : ["Location not provided"];
}
function participantCapacity(value: string | null | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^(?:0|[1-9]\d*)$/.test(normalized)) return null;
  const capacity = Number(normalized);
  return Number.isSafeInteger(capacity) && capacity > 0 ? capacity : null;
}

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
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(input.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [input]);
  const eventsQuery = useQuery({ queryKey: ["platform", "published-events", page, search], queryFn: () => getPublishedEvents(page, search) });
  const visible = (eventsQuery.data?.items ?? []).filter((event) => filter === "all" || temporalState(event) === filter);
  const emptyTitle = filter === "all" ? "No published events" : "No " + filter + " events";
  return <><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold text-[#06201c]">Event Management</h2><p className="mt-1 text-sm text-[#52736a]">Browse published events across all enterprises.</p></div></div>
    <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><label className="w-full lg:max-w-sm"><span className="sr-only">Search published events</span><input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search events..." className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label><div className="flex flex-wrap gap-2">{(["all", "upcoming", "ongoing", "finished"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={filter === item ? "h-10 rounded-full bg-[#e8f6ee] px-4 text-sm font-semibold text-[#1f6a58]" : "h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a]"}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div></div>
    {eventsQuery.isLoading ? <div role="status" className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[290px] animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div> : eventsQuery.isError ? <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">{eventsQuery.error instanceof PlatformEventsApiError ? eventsQuery.error.message : "Unable to load published events."}</p><button type="button" onClick={() => void eventsQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : visible.length === 0 ? <div className="mt-5 rounded-2xl bg-white p-10 text-center shadow-sm"><p className="font-bold">{emptyTitle}</p><p className="mt-2 text-sm text-[#52736a]">{filter === "all" ? "Published events will appear here once they have been approved and published." : "Try another temporal filter."}</p></div> : <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((event) => <PublishedEventCard key={event.id} event={event} />)}</div>}
    {eventsQuery.data && eventsQuery.data.pagination.total_pages > 1 ? <nav aria-label="Published Event pages" className="mt-6 flex justify-between"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {eventsQuery.data.pagination.page} of {eventsQuery.data.pagination.total_pages}</span><button type="button" disabled={page >= eventsQuery.data.pagination.total_pages} onClick={() => setPage((current) => current + 1)}>Next</button></nav> : null}
  </>;
}
function PublishedEventCard({ event }: { event: EventItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const state = temporalState(event);
  const image = event.primary_image?.trim();
  const organiser = nonEmpty(event.organiser_name);
  const capacity = participantCapacity(event.capacity);
  const venueLines = locationLines(event);
  return <article className="group overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-[#4f9f76] hover:shadow-lg"><div className="relative h-[180px] bg-gradient-to-br from-[#1f6a58] via-[#37836c] to-[#8ac7a7] p-5 text-white">{image && !imageFailed ? <><img src={image} alt="" aria-hidden="true" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]" /><div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#06201c]/78 via-[#0c382e]/68 to-[#1f6a58]/55" /></> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.26)_0_1px,transparent_1px)] bg-[length:28px_28px]" />}<span className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">{temporalLabel(state)}</span><div className="absolute bottom-5 left-5 right-5"><p className="text-sm font-bold text-white/80">{dateLabel(event.start_date)}</p><h3 className="mt-1 text-xl font-bold leading-tight">{event.title}</h3></div></div><div className="space-y-3 p-5 text-sm text-[#52736a]">{organiser ? <p><span className="font-semibold text-[#31594d]">Organiser: </span>{organiser}</p> : null}<div><p className="font-medium text-[#31594d]">{venueLines[0]}</p>{venueLines.slice(1).map((line) => <p key={line} className="mt-0.5">{line}</p>)}</div>{capacity !== null ? <p><span className="font-semibold text-[#31594d]">Capacity: </span>{capacity}</p> : null}</div></article>;
}
