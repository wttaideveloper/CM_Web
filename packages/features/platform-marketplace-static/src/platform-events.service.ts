export type TemporalFilter = "all" | "upcoming" | "ongoing" | "finished";

export type EventItem = {
  id: string;
  enterprise_id: string;
  enterprise_name?: string | null;
  title: string;
  category: string;
  organiser_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  time_zone?: string | null;
  primary_image?: string | null;
  delivery_mode?: string | null;
  venue?: EventVenue | null;
  capacity?: string | null;
  status: "published";
};

export type EventsResponse = {
  items: EventItem[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

export type EventVenue = { name?: string | null; address?: string | null; city?: string | null };
export type EventDocument = string | { url: string; name?: string | null };
export type EventTicketType = { id?: string; name: string; price?: string | null; currency?: string | null; capacity?: string | null };
export type EventSession = { id?: string; session_date?: string | null; title: string; description?: string | null; speaker?: string | null; speaker_bio?: string | null; start_time?: string | null; end_time?: string | null; location?: string | null; meeting_link?: string | null };
export type EventModuleState = Record<string, boolean>;

export type PublishedEventDetails = {
  id: string;
  tenant_id?: string | null;
  /** Supported if returned by a newer detail response; the current contract does not declare it. */
  tenant_name?: string | null;
  enterprise_id?: string | null;
  enterprise_name?: string | null;
  title: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  tags?: string[] | null;
  organiser_name?: string | null;
  organiser_contact?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  time_zone?: string | null;
  registration_cutoff?: string | null;
  primary_image?: string | null;
  gallery_images?: string[] | null;
  videos?: string[] | null;
  documents?: EventDocument[] | null;
  delivery_mode?: string | null;
  venue?: EventVenue | null;
  meeting_link?: string | null;
  meeting_provider?: string | null;
  price?: string | null;
  currency?: string | null;
  ticket_types?: EventTicketType[] | null;
  capacity?: string | null;
  min_participants?: string | null;
  max_participants?: string | null;
  registration_open_at?: string | null;
  registration_close_at?: string | null;
  sessions?: EventSession[] | null;
  lifecycle_state?: string | null;
  status: string;
  event_type?: string | { key?: string | null; name?: string | null } | null;
  modules?: EventModuleState | null;
};

export class PlatformEventsApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "PlatformEventsApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null | undefined {
  return value === null || value === undefined || typeof value === "string" ? value : undefined;
}

function optionalMediaUrl(value: unknown): string | null | undefined {
  if (value === null || value === undefined || typeof value === "string") return value;
  return isRecord(value) && typeof value.url === "string" ? value.url : undefined;
}

function optionalStringArray(value: unknown): string[] | null | undefined {
  return value === null || value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string")) ? value as string[] | null | undefined : undefined;
}

function optionalMediaUrlArray(value: unknown): string[] | null | undefined {
  if (value === null || value === undefined) return value;
  if (!Array.isArray(value)) return undefined;
  const urls = value.map(optionalMediaUrl);
  return urls.every((item): item is string => typeof item === "string") ? urls : undefined;
}

function optionalVenue(value: unknown): EventVenue | null | undefined {
  if (value === null || value === undefined) return value;
  if (!isRecord(value)) return undefined;
  return { name: optionalString(value.name), address: optionalString(value.address), city: optionalString(value.city) };
}

function optionalDocuments(value: unknown): EventDocument[] | null | undefined {
  if (value === null || value === undefined) return value;
  if (!Array.isArray(value)) return undefined;
  const documents = value.flatMap((item): EventDocument[] => {
    if (typeof item === "string") return [item];
    if (isRecord(item) && typeof item.url === "string") return [{ url: item.url, name: optionalString(item.name) }];
    return [];
  });
  return documents.length === value.length ? documents : undefined;
}

function optionalTicketTypes(value: unknown): EventTicketType[] | null | undefined {
  if (value === null || value === undefined) return value;
  if (!Array.isArray(value)) return undefined;
  const tickets = value.flatMap((item): EventTicketType[] => {
    if (!isRecord(item) || typeof item.name !== "string") return [];
    return [{ id: typeof item.id === "string" ? item.id : undefined, name: item.name, price: optionalString(item.price), currency: optionalString(item.currency), capacity: optionalString(item.capacity) }];
  });
  return tickets.length === value.length ? tickets : undefined;
}

function optionalSessions(value: unknown): EventSession[] | null | undefined {
  if (value === null || value === undefined) return value;
  if (!Array.isArray(value)) return undefined;
  const sessions = value.flatMap((item): EventSession[] => {
    if (!isRecord(item) || typeof item.title !== "string") return [];
    return [{
      id: typeof item.id === "string" ? item.id : undefined,
      session_date: optionalString(item.session_date),
      title: item.title,
      description: optionalString(item.description),
      speaker: optionalString(item.speaker),
      speaker_bio: optionalString(item.speaker_bio),
      start_time: optionalString(item.start_time),
      end_time: optionalString(item.end_time),
      location: optionalString(item.location),
      meeting_link: optionalString(item.meeting_link),
    }];
  });
  return sessions.length === value.length ? sessions : undefined;
}

function optionalModules(value: unknown): EventModuleState | null | undefined {
  if (value === null || value === undefined) return value;
  if (!isRecord(value)) return undefined;
  const modules: EventModuleState = {};
  for (const [key, item] of Object.entries(value)) if (typeof item === "boolean") modules[key] = item;
  return modules;
}

/** Validates and normalizes the fields used by the read-only published Event dossier. */
export function parsePublishedEventDetails(value: unknown): PublishedEventDetails {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string" || typeof value.category !== "string" || typeof value.status !== "string") throw new Error("The Event detail response is missing required fields.");
  const eventType = typeof value.event_type === "string" || value.event_type === null || value.event_type === undefined ? value.event_type : isRecord(value.event_type) ? { key: optionalString(value.event_type.key), name: optionalString(value.event_type.name) } : undefined;
  return {
    id: value.id,
    tenant_id: optionalString(value.tenant_id),
    tenant_name: optionalString(value.tenant_name),
    enterprise_id: optionalString(value.enterprise_id),
    enterprise_name: optionalString(value.enterprise_name),
    title: value.title,
    description: optionalString(value.description),
    category: value.category,
    subcategory: optionalString(value.subcategory),
    tags: optionalStringArray(value.tags),
    organiser_name: optionalString(value.organiser_name),
    organiser_contact: optionalString(value.organiser_contact),
    start_date: optionalString(value.start_date),
    end_date: optionalString(value.end_date),
    time_zone: optionalString(value.time_zone),
    registration_cutoff: optionalString(value.registration_cutoff),
    primary_image: optionalMediaUrl(value.primary_image),
    gallery_images: optionalMediaUrlArray(value.gallery_images),
    videos: optionalMediaUrlArray(value.videos),
    documents: optionalDocuments(value.documents),
    delivery_mode: optionalString(value.delivery_mode),
    venue: optionalVenue(value.venue),
    meeting_link: optionalString(value.meeting_link),
    meeting_provider: optionalString(value.meeting_provider),
    price: optionalString(value.price),
    currency: optionalString(value.currency),
    ticket_types: optionalTicketTypes(value.ticket_types),
    capacity: optionalString(value.capacity),
    min_participants: optionalString(value.min_participants),
    max_participants: optionalString(value.max_participants),
    registration_open_at: optionalString(value.registration_open_at),
    registration_close_at: optionalString(value.registration_close_at),
    sessions: optionalSessions(value.sessions),
    lifecycle_state: optionalString(value.lifecycle_state),
    status: value.status,
    event_type: eventType,
    modules: optionalModules(value.modules),
  };
}

function parseEvents(value: unknown): EventsResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination) || typeof value.pagination.total !== "number" || typeof value.pagination.page !== "number" || typeof value.pagination.page_size !== "number" || typeof value.pagination.total_pages !== "number" || !value.items.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.enterprise_id === "string" && typeof item.title === "string" && typeof item.category === "string" && item.status === "published")) throw new Error("The published Events response is invalid.");
  const items = value.items.map((item) => {
    const enterprise = isRecord(item.enterprise) ? item.enterprise : null;
    const enterpriseName = typeof item.enterprise_name === "string" ? item.enterprise_name : enterprise && (typeof enterprise.business_legal_name === "string" ? enterprise.business_legal_name : typeof enterprise.business_short_name === "string" ? enterprise.business_short_name : typeof enterprise.name === "string" ? enterprise.name : null);
    return { ...item, enterprise_name: enterpriseName, primary_image: optionalMediaUrl(item.primary_image) } as EventItem;
  });
  return { ...value, items } as EventsResponse;
}

async function createPlatformEventsApiError(response: Response, fallback: string): Promise<PlatformEventsApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401) return new PlatformEventsApiError(401, "Super Admin authentication is required.");
  if (response.status === 403) return new PlatformEventsApiError(403, "You do not have permission to view published Events.");
  const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : null;
  return new PlatformEventsApiError(response.status, detail ?? fallback);
}

export async function getPublishedEvents(page: number, search: string): Promise<EventsResponse> {
  const query = new URLSearchParams({ status: "published", page: String(page), page_size: "20" });
  if (search) query.set("search", search);
  const response = await fetch("/api/platform-super-admin/events?" + query.toString(), { credentials: "include" });
  if (!response.ok) throw await createPlatformEventsApiError(response, "Unable to load published events.");
  return parseEvents(await response.json());
}

export async function getPublishedEventDetails(eventId: string): Promise<PublishedEventDetails> {
  const response = await fetch(`/api/platform-super-admin/events/${encodeURIComponent(eventId)}`, { credentials: "include" });
  if (!response.ok) throw await createPlatformEventsApiError(response, "Unable to load Event details.");
  return parsePublishedEventDetails(await response.json());
}

export function dateLabel(value: string | null | undefined): string {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))) : "Date unavailable";
}

export function dateTuple(value: string | null | undefined): string | null {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value);
  return match ? [match[1], match[2], match[3], match[4] ?? "00", match[5] ?? "00", match[6] ?? "00"].join("") : null;
}

export function currentTuple(timeZone: string | null | undefined): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || undefined, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "00";
  return part("year") + part("month") + part("day") + part("hour") + part("minute") + part("second");
}

export function temporalState(event: Pick<EventItem, "start_date" | "end_date" | "time_zone">): Exclude<TemporalFilter, "all"> {
  const now = currentTuple(event.time_zone);
  const start = dateTuple(event.start_date);
  const end = dateTuple(event.end_date);
  if (!start || now < start) return "upcoming";
  if (end && now > end) return "finished";
  return "ongoing";
}

export function temporalLabel(state: Exclude<TemporalFilter, "all">): string { return state[0].toUpperCase() + state.slice(1); }
export function nonEmpty(value: string | null | undefined): string | null { const trimmed = value?.trim(); return trimmed || null; }

export function locationLines(event: Pick<EventItem, "delivery_mode" | "venue">): string[] {
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

export function participantCapacity(value: string | null | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^(?:0|[1-9]\d*)$/.test(normalized)) return null;
  const capacity = Number(normalized);
  return Number.isSafeInteger(capacity) && capacity > 0 ? capacity : null;
}
