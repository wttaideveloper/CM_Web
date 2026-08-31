/** An event returned by the Events list API. */
export interface Event {
  id: string;
  tenant_id: string;
  enterprise_id: string;
  location_id: string | null;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  organiser_name: string;
  organiser_contact: string;
  start_date: string;
  end_date: string;
  time_zone: string;
  registration_cutoff: string;
  primary_image: string;
  gallery_images: string[];
  videos: string[];
  documents: string[];
  delivery_mode: string;
  venue: EventVenue | null;
  meeting_link?: string | null;
  meeting_provider: string | null;
  price: string;
  currency: string;
  ticket_types: EventTicketType[];
  capacity: string;
  min_participants: string;
  max_participants: string;
  registration_open_at: string;
  registration_close_at: string;
  custom_fields: EventCustomField[];
  sessions: EventSessionRecord[];
  status: EventStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  enterprise_name?: string | null;
}

/** Pagination metadata returned with an Events list response. */
export interface EventListPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** The Events list API response. */
export interface EventListResponse {
  items: Event[];
  pagination: EventListPagination;
}

/** Backend-supported query parameters for listing Events. */
export interface EventListParams {
  search?: string;
  category?: string;
  tenant_id?: string;
  enterprise_id?: string;
  location_id?: string;
  status?: string;
  delivery_mode?: string;
  page?: number;
  page_size?: number;
}

/** Exact Swagger request body for POST /api/v1/events/{event_id}/announcements. */
export interface SendEventAnnouncementPayload {
  title?: string | null;
  message: string;
  recipient_type?: "all" | "registered" | "specific";
  channels?: Array<"in_app" | "push" | "email" | "sms">;
  metadata?: Record<string, unknown> | null;
}

/** A registration record returned by the backend-authoritative Event registrations endpoint. */
export interface EventRegistration {
  event_id: string;
  id: string;
  participant_email: string;
  ticket_type_id: string | null;
  status: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  participant_name: string;
  custom_fields: Record<string, unknown>;
  qr_code: string;
  checked_in_by: unknown | null;
  session_id: string | null;
}

/** The runtime-confirmed top-level registrations response for one Event. */
export type EventRegistrationsResponse = readonly EventRegistration[];

/** Runtime-confirmed purchase record returned for one Event. Monetary and quantity fields remain API strings. */
export interface EventOrder {
  id: string;
  participant_email: string;
  quantity: string;
  currency: string;
  status: string;
  refund_reason: string | null;
  updated_at: string;
  event_id: string;
  participant_name: string;
  ticket_type_id: string;
  amount: string;
  payment_status: string;
  payment_provider: string;
  created_at: string;
}

/** Runtime-confirmed top-level orders response for one Event. */
export type EventOrdersResponse = readonly EventOrder[];

/** Persisted Event template returned by the backend-authoritative templates API. */
export interface EventTemplate {
  id: string;
  tenant_id: string | null;
  enterprise_id: string | null;
  name: string;
  template_data: Record<string, unknown>;
  created_at: string;
}

/** Runtime-confirmed top-level template collection response. */
export type EventTemplatesResponse = readonly EventTemplate[];

/** Request contract for creating a reusable Event template. Scope is derived from the authenticated backend context. */
export interface CreateEventTemplatePayload {
  name: string;
  template_data: Record<string, unknown>;
}

/** Swagger defines GET /feedback with an empty response schema; preserve it as unknown. */
export type EventFeedbackResponse = unknown;

/** Runtime-confirmed JSON response for the registration Event report. */
export interface EventRegistrationReportResponse {
  event_id: string;
  type: "registration";
  data: {
    total_registrations: number;
    by_status: Record<string, number>;
    by_ticket_type: Record<string, number>;
  };
}

/** A participant row returned by the backend-authoritative Event attendance report. */
export interface EventAttendanceParticipant {
  registration_id: string;
  participant_name: string;
  participant_email: string;
  status: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_out_at: string | null;
  session_id: string | null;
  ticket_type_id: string | null;
}

/** Runtime-proven top-level response returned by the read-only Event attendance report. */
export interface EventAttendanceReport {
  event_id: string;
  total_registered: number;
  total_attended: number;
  total_no_show: number;
  attendance_by_session?: unknown | null;
  participants: readonly EventAttendanceParticipant[];
}

/** The focused payload accepted by the manual Event check-in endpoint. */
export type CheckInEventParticipantPayload =
  | { registration_id: string; qr_code?: never }
  | { qr_code: string; registration_id?: never };

/** The runtime-proven response returned after a successful Event check-in. */
export interface CheckInEventParticipantResponse {
  message: string;
  registration_id: string;
  participant_name: string;
  participant_email: string;
  status: string;
  checked_in_at: string;
  session_id: string | null;
}

/** The focused payload accepted by the manual Event undo-check-in endpoint. */
export interface UncheckInEventParticipantPayload {
  registration_id: string;
}

/** The focused payload accepted by the manual Event check-out endpoint. */
export interface CheckOutEventParticipantPayload {
  registration_id: string;
}

/** The focused payload accepted by the Event QR validation endpoint. */
export interface ValidateEventQrPayload {
  qr_code: string;
}

/** The runtime-proven response returned by Event QR validation. */
export interface ValidateEventQrResponse {
  valid: boolean;
  registration_id: string;
  participant_name: string;
  participant_email: string;
  status: string;
  event_id: string;
  event_title: string;
  ticket_type_id: string | null;
  message: string;
}

/** The runtime-confirmed top-level waitlist response for one Event. */
export type EventWaitlistResponse = readonly unknown[];

/** The runtime-confirmed top-level session representations returned for one Event. */
export type EventSessionsResponse = readonly EventSessionRecord[];

/** A backend-generated registrations CSV and its optional suggested filename. */
export interface EventRegistrationsExport {
  blob: Blob;
  filename: string | null;
}

/** A backend-generated calendar file and its optional suggested filename. */
export interface EventCalendarExport {
  blob: Blob;
  filename: string | null;
}

/** Geographic coordinates supplied with an Event venue. */
export interface EventVenueCoordinates {
  lat?: number | null;
  lng?: number | null;
}

/** Venue details returned by the Events API. */
export interface EventVenue {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  coordinates?: EventVenueCoordinates;
}

/** Complete venue details supplied when creating an Event. */
export interface CreateEventVenue extends EventVenue {
  name: string;
  address: string;
  city: string;
}

/** A purchasable ticket type supplied when creating an Event. */
export interface EventTicketType {
  id: string;
  name: string;
  price: string;
  currency: string;
  capacity: string;
}

/** A custom registration field returned by the Events API. */
export interface EventCustomField {
  label: string;
  type: string;
  options: string[];
}

/** A supported custom registration field supplied when creating an Event. */
export interface CreateEventCustomField extends EventCustomField {
  type: "select";
}

/** A session included in the initial Event create request. */
export interface EventSessionInput {
  session_date: string;
  title: string;
  speaker: string;
  start_time: string;
  end_time: string;
  location: string;
}

/** A session embedded in an Event response from the original create payload. */
export interface EventEmbeddedSession extends EventSessionInput {
  id?: never;
  meeting_link?: string | null;
}

/** A dedicated post-creation Session record returned by the Events API. */
export interface EventSession {
  id: string;
  session_date?: string | null;
  title: string;
  speaker: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  meeting_link: string | null;
}

/** A session representation that may be embedded or a dedicated Session resource. */
export type EventSessionRecord = EventEmbeddedSession | EventSession;

/** The live-contract request body for adding a post-creation Session. */
export interface AddEventSessionPayload {
  session_date: string;
  title: string;
  speaker?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  meeting_link?: string | null;
}

/** Writable fields accepted by the live partial EventSessionUpdate schema. */
export interface UpdateEventSessionPayload {
  session_date?: string | null;
  title?: string | null;
  speaker?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  meeting_link?: string | null;
}

/** The confirmed request body accepted by the Events create endpoint. */
export interface CreateEventPayload {
  tenant_id: string;
  enterprise_id: string;
  location_id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  organiser_name: string;
  organiser_contact: string;
  start_date: string;
  end_date: string;
  time_zone: string;
  registration_cutoff: string;
  primary_image: string;
  gallery_images: string[];
  videos: string[];
  documents: string[];
  delivery_mode: "in_person";
  venue: CreateEventVenue;
  meeting_link: string | null;
  meeting_provider: string | null;
  price: string;
  currency: string;
  ticket_types: EventTicketType[];
  capacity: string;
  min_participants: string;
  max_participants: string;
  registration_open_at: string;
  registration_close_at: string;
  custom_fields: CreateEventCustomField[];
  sessions: EventSessionInput[];
  status: "draft";
}

/**
 * Writable fields accepted by the partial EventUpdate schema.
 *
 * Tenant ownership and lifecycle status are intentionally not included: this editor
 * must not transfer an event or perform a status transition.
 */
export interface UpdateEventPayload {
  location_id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
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
  documents?: string[] | null;
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
  custom_fields?: EventCustomField[] | null;
  sessions?: EventSessionInput[] | null;
}

/** Runtime-confirmed JSON response returned after a successful Event deletion. */
export interface DeleteEventResponse {
  message: string;
}

/** A safely displayable Events API failure. */
export class EventsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

const eventsBasePath = "/api/v1/events/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEventVenueCoordinates(value: unknown): value is EventVenueCoordinates {
  return (
    isRecord(value) &&
    (value.lat === undefined || value.lat === null || typeof value.lat === "number") &&
    (value.lng === undefined || value.lng === null || typeof value.lng === "number")
  );
}

function isEventVenue(value: unknown): value is EventVenue {
  return (
    isRecord(value) &&
    (value.name === undefined || value.name === null || typeof value.name === "string") &&
    (value.address === undefined || value.address === null || typeof value.address === "string") &&
    (value.city === undefined || value.city === null || typeof value.city === "string") &&
    (value.coordinates === undefined || isEventVenueCoordinates(value.coordinates))
  );
}

function isEventTicketType(value: unknown): value is EventTicketType {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.price === "string" &&
    typeof value.currency === "string" &&
    typeof value.capacity === "string"
  );
}

function isEventCustomField(value: unknown): value is EventCustomField {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.type === "string" &&
    isStringArray(value.options)
  );
}

function isEventSessionInput(value: unknown): value is EventSessionInput {
  return (
    isRecord(value) &&
    typeof value.session_date === "string" &&
    typeof value.title === "string" &&
    typeof value.speaker === "string" &&
    typeof value.start_time === "string" &&
    typeof value.end_time === "string" &&
    typeof value.location === "string"
  );
}

function isEventEmbeddedSession(value: unknown): value is EventEmbeddedSession {
  return (
    isEventSessionInput(value) &&
    !("id" in value) &&
    (!("meeting_link" in value) || value.meeting_link === undefined || value.meeting_link === null || typeof value.meeting_link === "string")
  );
}

function isEventSession(value: unknown): value is EventSession {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" &&
    (value.session_date === undefined || value.session_date === null || typeof value.session_date === "string") &&
    (value.speaker === null || typeof value.speaker === "string") &&
    (value.start_time === null || typeof value.start_time === "string") &&
    (value.end_time === null || typeof value.end_time === "string") &&
    (value.location === null || typeof value.location === "string") &&
    (value.meeting_link === undefined || value.meeting_link === null || typeof value.meeting_link === "string");
}

function isEventSessionRecord(value: unknown): value is EventSessionRecord {
  return isEventSession(value) || isEventEmbeddedSession(value);
}

function isEvent(value: unknown): value is Event {
  if (!isRecord(value) || (value.venue !== null && !isEventVenue(value.venue))) {
    return false;
  }

  const stringFields: Array<keyof Omit<Event, "location_id" | "venue" | "meeting_link" | "meeting_provider" | "tags" | "gallery_images" | "videos" | "documents" | "ticket_types" | "custom_fields" | "sessions" | "is_deleted">> = [
    "id", "tenant_id", "enterprise_id", "title", "description", "category", "subcategory",
    "organiser_name", "organiser_contact", "start_date", "end_date", "time_zone", "registration_cutoff",
    "primary_image", "delivery_mode", "price", "currency", "capacity",
    "min_participants", "max_participants", "registration_open_at", "registration_close_at", "created_at", "updated_at",
  ];
  const stringArrayFields = ["tags", "gallery_images", "videos", "documents"];

  return (
    stringFields.every((field) => typeof value[field] === "string") &&
    stringArrayFields.every((field) => isStringArray(value[field])) &&
    (value.location_id === null || typeof value.location_id === "string") &&
    (value.meeting_link === null || typeof value.meeting_link === "string") &&
    (value.meeting_provider === null || typeof value.meeting_provider === "string") &&
    Array.isArray(value.ticket_types) && value.ticket_types.every(isEventTicketType) &&
    Array.isArray(value.custom_fields) && value.custom_fields.every(isEventCustomField) &&
    Array.isArray(value.sessions) && value.sessions.every(isEventSessionRecord) &&
    (value.enterprise_name === undefined || value.enterprise_name === null || typeof value.enterprise_name === "string") &&
    typeof value.is_deleted === "boolean" &&
    isEventStatus(value.status)
  );
}

function isPagination(value: unknown): value is EventListPagination {
  return (
    isRecord(value) &&
    typeof value.total === "number" &&
    typeof value.page === "number" &&
    typeof value.page_size === "number" &&
    typeof value.total_pages === "number"
  );
}

function isDeleteEventResponse(value: unknown): value is DeleteEventResponse {
  return isRecord(value) && typeof value.message === "string";
}

function parseEventListResponse(value: unknown): EventListResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isEvent) || !isPagination(value.pagination)) {
    throw new Error("Events API returned an invalid list response.");
  }

  return { items: value.items, pagination: value.pagination };
}

function isEventRegistration(value: unknown): value is EventRegistration {
  return isRecord(value) &&
    typeof value.event_id === "string" &&
    typeof value.id === "string" &&
    typeof value.participant_email === "string" &&
    (value.ticket_type_id === null || typeof value.ticket_type_id === "string") &&
    typeof value.status === "string" &&
    (value.checked_in_at === null || typeof value.checked_in_at === "string") &&
    (value.checked_out_at === null || typeof value.checked_out_at === "string") &&
    typeof value.created_at === "string" &&
    typeof value.participant_name === "string" &&
    isRecord(value.custom_fields) &&
    typeof value.qr_code === "string" &&
    "checked_in_by" in value &&
    (value.session_id === null || typeof value.session_id === "string");
}

function parseEventRegistrationsResponse(value: unknown): EventRegistrationsResponse {
  if (!Array.isArray(value) || !value.every(isEventRegistration)) {
    throw new Error("Events API returned an invalid registrations response.");
  }

  return value;
}

function isEventOrder(value: unknown): value is EventOrder {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.participant_email === "string" &&
    typeof value.quantity === "string" &&
    typeof value.currency === "string" &&
    typeof value.status === "string" &&
    (value.refund_reason === null || typeof value.refund_reason === "string") &&
    typeof value.updated_at === "string" &&
    typeof value.event_id === "string" &&
    typeof value.participant_name === "string" &&
    typeof value.ticket_type_id === "string" &&
    typeof value.amount === "string" &&
    typeof value.payment_status === "string" &&
    typeof value.payment_provider === "string" &&
    typeof value.created_at === "string";
}

function parseEventOrdersResponse(value: unknown): EventOrdersResponse {
  if (!Array.isArray(value) || !value.every(isEventOrder)) {
    throw new Error("Events API returned an invalid orders response.");
  }

  return value;
}

function isEventTemplate(value: unknown): value is EventTemplate {
  return isRecord(value) &&
    typeof value.id === "string" &&
    (value.tenant_id === null || typeof value.tenant_id === "string") &&
    (value.enterprise_id === null || typeof value.enterprise_id === "string") &&
    typeof value.name === "string" &&
    isRecord(value.template_data) &&
    typeof value.created_at === "string";
}

function parseEventTemplatesResponse(value: unknown): EventTemplatesResponse {
  if (!Array.isArray(value) || !value.every(isEventTemplate)) {
    throw new Error("Events API returned an invalid templates response.");
  }

  return value;
}

function isEventAttendanceParticipant(value: unknown): value is EventAttendanceParticipant {
  return isRecord(value) &&
    typeof value.registration_id === "string" &&
    typeof value.participant_name === "string" &&
    typeof value.participant_email === "string" &&
    typeof value.status === "string" &&
    (value.checked_in_at === null || typeof value.checked_in_at === "string") &&
    (value.checked_in_by === null || typeof value.checked_in_by === "string") &&
    (value.checked_out_at === null || typeof value.checked_out_at === "string") &&
    (value.session_id === null || typeof value.session_id === "string") &&
    (value.ticket_type_id === null || typeof value.ticket_type_id === "string");
}

function isCheckInEventParticipantResponse(value: unknown): value is CheckInEventParticipantResponse {
  return isRecord(value) &&
    typeof value.message === "string" &&
    typeof value.registration_id === "string" &&
    typeof value.participant_name === "string" &&
    typeof value.participant_email === "string" &&
    typeof value.status === "string" &&
    typeof value.checked_in_at === "string" &&
    (value.session_id === null || typeof value.session_id === "string");
}

function isValidateEventQrResponse(value: unknown): value is ValidateEventQrResponse {
  return isRecord(value) &&
    typeof value.valid === "boolean" &&
    typeof value.registration_id === "string" &&
    typeof value.participant_name === "string" &&
    typeof value.participant_email === "string" &&
    typeof value.status === "string" &&
    typeof value.event_id === "string" &&
    typeof value.event_title === "string" &&
    (value.ticket_type_id === null || typeof value.ticket_type_id === "string") &&
    typeof value.message === "string";
}

function parseEventAttendanceReport(value: unknown): EventAttendanceReport {
  if (!isRecord(value) || typeof value.event_id !== "string" || typeof value.total_registered !== "number" || !Number.isFinite(value.total_registered) || typeof value.total_attended !== "number" || !Number.isFinite(value.total_attended) || typeof value.total_no_show !== "number" || !Number.isFinite(value.total_no_show) || !Array.isArray(value.participants) || !value.participants.every(isEventAttendanceParticipant)) {
    throw new Error("Events API returned an invalid attendance response.");
  }
  const attendanceBySession = "attendance_by_session" in value ? value.attendance_by_session ?? null : undefined;
  return { event_id: value.event_id, total_registered: value.total_registered, total_attended: value.total_attended, total_no_show: value.total_no_show, attendance_by_session: attendanceBySession, participants: value.participants };
}

function parseEventWaitlistResponse(value: unknown): EventWaitlistResponse {
  if (!Array.isArray(value)) {
    throw new Error("Events API returned an invalid waitlist response.");
  }

  return value;
}

function parseEventSessionsResponse(value: unknown): EventSessionsResponse {
  if (!Array.isArray(value) || !value.every(isEventSessionRecord)) {
    throw new Error("Events API returned an invalid sessions response.");
  }

  return value;
}

function getAttachmentFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const encodedFilename = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1];
  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename);
    } catch {
      return null;
    }
  }

  const filename = /filename=(?:"([^"]+)"|([^;\s]+))/i.exec(contentDisposition);
  return filename?.[1] ?? filename?.[2] ?? null;
}

function readErrorMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(readErrorMessages);
  }

  if (isRecord(value)) {
    return readErrorMessages(value.detail ?? value.message ?? "");
  }

  return [];
}

async function createEventsApiError(response: Response, operation: string): Promise<EventsApiError> {
  const body = await response.json().catch(() => null) as unknown;
  const fieldErrors: Record<string, string[]> = {};

  if (isRecord(body) && Array.isArray(body.detail)) {
    for (const detail of body.detail) {
      if (!isRecord(detail) || !Array.isArray(detail.loc)) {
        continue;
      }

      const field = [...detail.loc].reverse().find((item): item is string => typeof item === "string");
      const messages = readErrorMessages(detail.msg);
      if (field && messages.length > 0) {
        fieldErrors[field] = [...(fieldErrors[field] ?? []), ...messages];
      }
    }
  }

  const message = readErrorMessages(body)[0] ?? `Unable to ${operation} (HTTP ${response.status}).`;
  return new EventsApiError(message, response.status, fieldErrors);
}

function toSearchParams(params: EventListParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  return searchParams;
}

/** Lists Events scoped by the caller's authenticated enterprise context. */
export async function listEvents(params: EventListParams): Promise<EventListResponse> {
  const searchParams = toSearchParams(params);
  const response = await fetch(`${eventsBasePath}?${searchParams.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Unable to load events (HTTP ${response.status}).`);
  }

  return parseEventListResponse((await response.json()) as unknown);
}

/** Reads submitted Event feedback through the authenticated same-origin Events proxy. */
export async function getEventFeedback(eventId: string): Promise<EventFeedbackResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/feedback`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load event feedback");
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

/** Reads the only documented Event report defaults: type=registration and format=json. */
export async function getEventReport(eventId: string): Promise<EventRegistrationReportResponse> {
  const searchParams = new URLSearchParams({ type: "registration", format: "json" });
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/reports?${searchParams.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load this event report");
  }

  return (await response.json()) as EventRegistrationReportResponse;
}

/** Creates an Event using the authenticated browser session. */
export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const response = await fetch(eventsBasePath, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "create this event");
  }

  const value = (await response.json()) as unknown;
  if (!isEvent(value)) {
    throw new Error("Events API returned an invalid created event response.");
  }

  return value;
}

/** Retrieves one Event by its backend identifier using the authenticated browser session. */
export async function getEventById(eventId: string): Promise<Event> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load this event");
  }

  const value = (await response.json()) as unknown;
  if (!isEvent(value)) {
    throw new Error("Events API returned an invalid event response.");
  }

  return value;
}

/** Lists registration records for one Event through the authenticated same-origin proxy. */
export async function getEventRegistrations(eventId: string): Promise<EventRegistrationsResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/registrations`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load registrations");
  }

  return parseEventRegistrationsResponse((await response.json()) as unknown);
}

/** Lists backend-authoritative purchase records for one Event through the same-origin proxy. */
export async function getEventOrders(eventId: string): Promise<EventOrdersResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/orders`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load orders");
  }

  return parseEventOrdersResponse((await response.json()) as unknown);
}

/** Lists reusable Event templates through the authenticated same-origin Events proxy. */
export async function getEventTemplates(): Promise<EventTemplatesResponse> {
  const response = await fetch(`${eventsBasePath}templates`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load event templates");
  }

  return parseEventTemplatesResponse((await response.json()) as unknown);
}

/** Creates an Event template while allowing the backend to derive tenant and enterprise scope. */
export async function createEventTemplate(
  payload: CreateEventTemplatePayload,
): Promise<EventTemplate> {
  const response = await fetch(`${eventsBasePath}templates`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "create this event template");
  }

  const value = (await response.json()) as unknown;
  if (!isEventTemplate(value)) {
    throw new Error("Events API returned an invalid created template response.");
  }

  return value;
}

/** Applies a template and returns the independently editable draft Event created by the backend. */
export async function applyEventTemplate(templateId: string): Promise<Event> {
  const response = await fetch(`${eventsBasePath}templates/${encodeURIComponent(templateId)}/apply`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "apply this event template");
  }

  const value = (await response.json()) as unknown;
  if (!isEvent(value)) {
    throw new Error("Events API returned an invalid applied template response.");
  }

  return value;
}

/** Loads the backend-authoritative read-only attendance report for one Event. */
export async function getEventAttendance(eventId: string): Promise<EventAttendanceReport> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/attendance`, {
    credentials: "include",
  });
  if (!response.ok) throw await createEventsApiError(response, "load attendance");
  return parseEventAttendanceReport((await response.json()) as unknown);
}

/** Checks in one confirmed Event participant using their backend registration identifier. */
export async function checkInEventParticipant(eventId: string, payload: CheckInEventParticipantPayload): Promise<CheckInEventParticipantResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/check-in`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "check in this participant");
  }

  const value = (await response.json()) as unknown;
  if (!isCheckInEventParticipantResponse(value)) {
    throw new Error("Events API returned an invalid check-in response.");
  }
  return value;
}

/** Reverses one participant check-in through the authenticated same-origin Events proxy. */
export async function uncheckInEventParticipant(eventId: string, payload: UncheckInEventParticipantPayload): Promise<unknown> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/uncheck-in`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "undo this participant check-in");
  }

  const responseText = await response.text();
  if (!responseText) return null;
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

/** Checks out one checked-in Event participant through the authenticated same-origin Events proxy. */
export async function checkOutEventParticipant(eventId: string, payload: CheckOutEventParticipantPayload): Promise<unknown> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/check-out`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "check out this participant");
  }

  const responseText = await response.text();
  if (!responseText) return null;
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

/** Validates a backend-issued Event ticket QR code without changing attendance state. */
export async function validateEventQr(eventId: string, payload: ValidateEventQrPayload): Promise<ValidateEventQrResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/validate-qr`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "validate this ticket");
  }

  const value = (await response.json()) as unknown;
  if (!isValidateEventQrResponse(value)) {
    throw new Error("Events API returned an invalid QR validation response.");
  }
  return value;
}

/** Lists waitlist records for one Event through the authenticated same-origin proxy. */
export async function getEventWaitlist(eventId: string): Promise<EventWaitlistResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/waitlist`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load the waitlist");
  }

  return parseEventWaitlistResponse((await response.json()) as unknown);
}

/** Lists validated embedded and dedicated Session records through the authenticated same-origin proxy. */
export async function getEventSessions(eventId: string): Promise<EventSessionsResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/sessions`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "load sessions");
  }

  return parseEventSessionsResponse((await response.json()) as unknown);
}

/** Adds one dedicated post-creation Session through the authenticated same-origin proxy. */
export async function addEventSession(eventId: string, payload: AddEventSessionPayload): Promise<EventSession> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/sessions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "add this session");
  }

  const value = (await response.json()) as unknown;
  if (!isEventSession(value)) {
    throw new Error("Events API returned an invalid added session response.");
  }

  return value;
}

/** Partially updates one ID-bearing Session through the authenticated same-origin proxy. */
export async function updateEventSession(eventId: string, sessionId: string, payload: UpdateEventSessionPayload): Promise<EventSession> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "update this session");
  }

  const value = (await response.json()) as unknown;
  if (!isEventSession(value)) {
    throw new Error("Events API returned an invalid updated session response.");
  }

  return value;
}

/** Deletes one ID-bearing Session through the authenticated same-origin proxy. */
export async function deleteEventSession(eventId: string, sessionId: string): Promise<DeleteEventResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "delete this session");
  }

  const value = (await response.json()) as unknown;
  if (!isDeleteEventResponse(value)) {
    throw new Error("Events API returned an invalid deleted session response.");
  }

  return value;
}

/** Downloads the backend-authoritative registrations CSV through the authenticated same-origin proxy. */
export async function exportEventRegistrations(eventId: string): Promise<EventRegistrationsExport> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/registrations/export`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "export registrations");
  }

  const contentType = response.headers.get("Content-Type");
  if (!contentType?.toLowerCase().startsWith("text/csv")) {
    throw new Error("Events API returned an unexpected registrations export response.");
  }

  return {
    blob: await response.blob(),
    filename: getAttachmentFilename(response.headers.get("Content-Disposition")),
  };
}

/** Downloads an Event calendar file through the authenticated same-origin Events proxy. */
export async function downloadEventCalendar(eventId: string): Promise<EventCalendarExport> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/calendar.ics`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "download this event calendar");
  }

  return {
    blob: await response.blob(),
    filename: getAttachmentFilename(response.headers.get("Content-Disposition")),
  };
}

/** Downloads one Event Session calendar file through the authenticated same-origin Events proxy. */
export async function downloadEventSessionCalendar(
  eventId: string,
  sessionId: string,
): Promise<EventCalendarExport> {
  const response = await fetch(
    `${eventsBasePath}${encodeURIComponent(eventId)}/sessions/${encodeURIComponent(sessionId)}/calendar.ics`,
    { credentials: "include" },
  );

  if (!response.ok) {
    throw await createEventsApiError(response, "download this session calendar");
  }

  return {
    blob: await response.blob(),
    filename: getAttachmentFilename(response.headers.get("Content-Disposition")),
  };
}

/** Updates an Event through the authenticated same-origin Events proxy. */
export async function updateEvent(eventId: string, payload: UpdateEventPayload): Promise<Event> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "save changes to this event");
  }

  const value = (await response.json()) as unknown;
  if (!isEvent(value)) {
    throw new Error("Events API returned an invalid updated event response.");
  }

  return value;
}

/** Duplicates an Event through the backend-authoritative authenticated endpoint. */
export async function duplicateEvent(eventId: string): Promise<Event> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/duplicate`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "duplicate this event");
  }

  const value = (await response.json()) as unknown;
  if (!isEvent(value)) {
    throw new Error("Events API returned an invalid duplicated event response.");
  }

  return value;
}

/** Deletes an eligible Event through the authenticated same-origin Events proxy. */
export async function deleteEvent(eventId: string): Promise<DeleteEventResponse> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "delete this event");
  }

  const value = (await response.json()) as unknown;
  if (!isDeleteEventResponse(value)) {
    throw new Error("Events API returned an invalid deleted event response.");
  }

  return value;
}

/** Updates only an Event lifecycle status through the dedicated authenticated endpoint. */
export async function updateEventStatus(eventId: string, payload: EventStatusUpdatePayload): Promise<Event> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "update this event status");
  }

  const value = (await response.json()) as unknown;
  if (!isEvent(value)) {
    throw new Error("Events API returned an invalid updated event status response.");
  }

  return value;
}

/** Sends an Event announcement through the authenticated same-origin Events proxy. */
export async function sendEventAnnouncement(
  eventId: string,
  payload: SendEventAnnouncementPayload,
): Promise<void> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/announcements`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "send this announcement");
  }
}

/** Sends the backend-defined immediate Event reminder through the same-origin Events proxy. */
export async function sendEventReminder(eventId: string): Promise<void> {
  const response = await fetch(`${eventsBasePath}${encodeURIComponent(eventId)}/remind`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw await createEventsApiError(response, "send this reminder");
  }
}
import { isEventStatus, type EventStatus, type EventStatusUpdatePayload } from "./event-status";
