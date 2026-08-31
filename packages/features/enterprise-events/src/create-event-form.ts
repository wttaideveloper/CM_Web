import type {
  CreateEventPayload,
  CreateEventCustomField,
  EventCustomField,
  EventSessionInput,
  EventTicketType,
  CreateEventVenue,
  Event,
  UpdateEventPayload,
} from "./events.service";
import { getEventSessionDates, getSessionTimeBounds } from "./event-session-date";

/** An editable ticket row in the Create Event workspace. */
export interface EventTicketFormValue extends EventTicketType {}

/** An editable custom registration-field row. */
export interface EventCustomFieldFormValue extends EventCustomField {}

/** All local values maintained by the Create Event workspace. */
export interface CreateEventFormValues {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  organiser_name: string;
  organiser_contact: string;
  start_date: string;
  end_date: string;
  registration_cutoff: string;
  registration_open_at: string;
  registration_close_at: string;
  time_zone: string;
  delivery_mode: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  venue_latitude: string;
  venue_longitude: string;
  meeting_link: string;
  meeting_provider: string;
  price: string;
  currency: string;
  ticket_types: EventTicketFormValue[];
  capacity: string;
  min_participants: string;
  max_participants: string;
  primary_image: string;
  gallery_images: string[];
  videos: string[];
  documents: string[];
  custom_fields: EventCustomFieldFormValue[];
  sessions: EventSessionInput[];
}

/** Returns blank values for a newly opened Create Event workspace. */
export function createEmptyEventForm(): CreateEventFormValues {
  return {
    title: "", description: "", category: "", subcategory: "", tags: [], organiser_name: "",
    organiser_contact: "", start_date: "", end_date: "", registration_cutoff: "",
    registration_open_at: "", registration_close_at: "", time_zone: "Asia/Kolkata", delivery_mode: "in_person",
    venue_name: "", venue_address: "", venue_city: "", venue_latitude: "", venue_longitude: "",
    meeting_link: "", meeting_provider: "", price: "", currency: "INR", ticket_types: [], capacity: "",
    min_participants: "", max_participants: "", primary_image: "", gallery_images: [], videos: [], documents: [],
    custom_fields: [], sessions: [],
  };
}

/** Builds a confirmed Create Event payload without response-only fields. */
export function buildCreateEventPayload(
  values: CreateEventFormValues,
  tenantId: string,
  enterpriseId: string,
  locationId: string,
): CreateEventPayload {
  const coordinates = buildCoordinates(values.venue_latitude, values.venue_longitude);
  const venue: CreateEventVenue = {
    name: values.venue_name.trim(),
    address: values.venue_address.trim(),
    city: values.venue_city.trim(),
    ...(coordinates ? { coordinates } : {}),
  };

  return {
    tenant_id: tenantId,
    enterprise_id: enterpriseId,
    location_id: locationId,
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    subcategory: values.subcategory.trim(),
    tags: values.tags,
    organiser_name: values.organiser_name.trim(),
    organiser_contact: values.organiser_contact.trim(),
    start_date: toBackendLocalDateTime(values.start_date),
    end_date: toBackendLocalDateTime(values.end_date),
    time_zone: values.time_zone,
    registration_cutoff: toBackendLocalDateTime(values.registration_cutoff),
    primary_image: values.primary_image.trim(),
    gallery_images: values.gallery_images,
    videos: values.videos,
    documents: values.documents,
    delivery_mode: values.delivery_mode as "in_person",
    venue,
    meeting_link: values.meeting_link.trim() || null,
    meeting_provider: values.meeting_provider.trim() || null,
    price: values.price.trim(),
    currency: values.currency.trim(),
    ticket_types: values.ticket_types,
    capacity: values.capacity.trim(),
    min_participants: values.min_participants.trim(),
    max_participants: values.max_participants.trim(),
    registration_open_at: toBackendLocalDateTime(values.registration_open_at),
    registration_close_at: toBackendLocalDateTime(values.registration_close_at),
    custom_fields: values.custom_fields as CreateEventCustomField[],
    sessions: values.sessions,
    status: "draft",
  };
}

/** Converts a real Event response into usable editable controls without literal null values. */
export function eventToFormValues(event: Event): CreateEventFormValues {
  return {
    title: event.title, description: event.description, category: event.category, subcategory: event.subcategory,
    tags: event.tags, organiser_name: event.organiser_name, organiser_contact: event.organiser_contact,
    start_date: toDateTimeLocal(event.start_date), end_date: toDateTimeLocal(event.end_date),
    registration_cutoff: toDateTimeLocal(event.registration_cutoff), registration_open_at: toDateTimeLocal(event.registration_open_at),
    registration_close_at: toDateTimeLocal(event.registration_close_at), time_zone: event.time_zone, delivery_mode: event.delivery_mode,
    venue_name: event.venue?.name ?? "", venue_address: event.venue?.address ?? "", venue_city: event.venue?.city ?? "",
    venue_latitude: event.venue?.coordinates?.lat?.toString() ?? "", venue_longitude: event.venue?.coordinates?.lng?.toString() ?? "",
    meeting_link: event.meeting_link ?? "", meeting_provider: event.meeting_provider ?? "", price: event.price,
    currency: event.currency, ticket_types: event.ticket_types, capacity: event.capacity,
    min_participants: event.min_participants, max_participants: event.max_participants, primary_image: event.primary_image,
    gallery_images: event.gallery_images, videos: event.videos, documents: event.documents,
    custom_fields: event.custom_fields, sessions: event.sessions.map(({ session_date, title, speaker, start_time, end_time, location }) => ({ session_date: session_date ?? "", title, speaker: speaker ?? "", start_time: start_time ?? "", end_time: end_time ?? "", location: location ?? "" })),
  };
}

/** Builds the partial writable EventUpdate request, preserving untouched backend values. */
export function buildUpdateEventPayload(values: CreateEventFormValues, initialValues: CreateEventFormValues, locationId: string, initialLocationId: string): UpdateEventPayload {
  const changed = <Key extends keyof CreateEventFormValues>(key: Key): boolean => JSON.stringify(values[key]) !== JSON.stringify(initialValues[key]);
  const payload: UpdateEventPayload = {};
  const scalarKeys: Array<keyof Pick<CreateEventFormValues, "title" | "description" | "category" | "subcategory" | "tags" | "organiser_name" | "organiser_contact" | "time_zone" | "delivery_mode" | "primary_image" | "gallery_images" | "videos" | "documents" | "price" | "currency" | "ticket_types" | "capacity" | "min_participants" | "max_participants" | "custom_fields" | "sessions">> = ["title", "description", "category", "subcategory", "tags", "organiser_name", "organiser_contact", "time_zone", "delivery_mode", "primary_image", "gallery_images", "videos", "documents", "price", "currency", "ticket_types", "capacity", "min_participants", "max_participants", "custom_fields", "sessions"];
  for (const key of scalarKeys) if (changed(key)) Object.assign(payload, { [key]: values[key] });
  const datetimeKeys: Array<keyof Pick<CreateEventFormValues, "start_date" | "end_date" | "registration_cutoff" | "registration_open_at" | "registration_close_at">> = ["start_date", "end_date", "registration_cutoff", "registration_open_at", "registration_close_at"];
  for (const key of datetimeKeys) if (changed(key)) Object.assign(payload, { [key]: toBackendLocalDateTime(values[key]) });
  if (values.meeting_link !== initialValues.meeting_link) payload.meeting_link = values.meeting_link.trim() || null;
  if (values.meeting_provider !== initialValues.meeting_provider) payload.meeting_provider = values.meeting_provider.trim() || null;
  if (locationId !== initialLocationId) payload.location_id = locationId || null;
  const venueFields: Array<keyof CreateEventFormValues> = ["venue_name", "venue_address", "venue_city", "venue_latitude", "venue_longitude"];
  if (venueFields.some((field) => changed(field))) payload.venue = buildVenue(values);
  return payload;
}

/** Validates the safe, user-supplied Create Event values before submission. */
export function validateEventForm(values: CreateEventFormValues, hasLocation: boolean, mode: "create" | "edit" = "create"): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const require = (field: keyof CreateEventFormValues, label: string) => {
    if (!String(values[field]).trim()) errors[field] = [`${label} is required.`];
  };
  if (mode === "create") {
    require("title", "Event name"); require("description", "Description"); require("category", "Category");
    require("organiser_name", "Organizer"); require("organiser_contact", "Organizer contact");
    require("start_date", "Start date and time"); require("end_date", "End date and time");
    require("registration_cutoff", "Registration cutoff"); require("registration_open_at", "Registration opening");
    require("registration_close_at", "Registration closing"); require("venue_name", "Venue name");
    require("venue_address", "Venue address"); require("venue_city", "Venue city"); require("price", "Price");
    require("currency", "Currency"); require("capacity", "Overall capacity");
    require("min_participants", "Minimum participants"); require("max_participants", "Maximum participants");
    if (!hasLocation) errors.location_id = ["Select an existing enterprise location before creating this event."];
  }
  validateDateOrder(values, errors);
  validateNumbers(values, errors);
  validateUrls(values, errors);
  validateRepeatingValues(values, errors);
  return errors;
}

function validateDateOrder(values: CreateEventFormValues, errors: Record<string, string[]>): void {
  const start = Date.parse(values.start_date); const end = Date.parse(values.end_date);
  const opens = Date.parse(values.registration_open_at); const closes = Date.parse(values.registration_close_at);
  const cutoff = Date.parse(values.registration_cutoff);
  if (Number.isFinite(start) && Number.isFinite(end) && end < start) errors.end_date = ["End must not be earlier than start."];
  if (Number.isFinite(opens) && Number.isFinite(closes) && closes < opens) errors.registration_close_at = ["Registration closing must not be earlier than opening."];
  if (Number.isFinite(cutoff) && Number.isFinite(start) && cutoff > start) errors.registration_cutoff = ["Registration cutoff must not be after the event starts."];
}

function validateNumbers(values: CreateEventFormValues, errors: Record<string, string[]>): void {
  const numericFields: Array<keyof CreateEventFormValues> = ["price", "capacity", "min_participants", "max_participants"];
  for (const field of numericFields) if (Number(values[field]) < 0 || !Number.isFinite(Number(values[field]))) errors[field] = ["Enter a non-negative number."];
  if (Number(values.max_participants) < Number(values.min_participants)) errors.max_participants = ["Maximum participants must not be below minimum participants."];
}

function validateUrls(values: CreateEventFormValues, errors: Record<string, string[]>): void {
  const urls = [values.primary_image, ...values.gallery_images, ...values.videos, ...values.documents, values.meeting_link].filter(Boolean);
  if (urls.some((value) => !isUrl(value))) errors.media = ["Enter valid URLs for media and meeting links."];
}

function validateRepeatingValues(values: CreateEventFormValues, errors: Record<string, string[]>): void {
  const invalidTicket = values.ticket_types.some(
    (ticket) =>
      !ticket.id.trim() ||
      !ticket.name.trim() ||
      !ticket.currency.trim() ||
      !isNonNegativeNumber(ticket.price) ||
      !isNonNegativeNumber(ticket.capacity),
  );
  if (invalidTicket) errors.ticket_types = ["Each ticket needs an ID, name, currency, non-negative price, and capacity."];

  const validSessionDates = getEventSessionDates(values.start_date, values.end_date);
  const invalidSession = values.sessions.some((session) => { const bounds = getSessionTimeBounds(session.session_date, values.start_date, values.end_date); return !validSessionDates.includes(session.session_date) || !session.title.trim() || !session.speaker.trim() || !session.location.trim() || !session.start_time || !session.end_time || session.end_time <= session.start_time || session.start_time < bounds.min || session.start_time > bounds.max || session.end_time < bounds.min || session.end_time > bounds.max; });
  if (invalidSession) errors.sessions = ["Each session needs a valid event date, complete details, and times within the event schedule."];

  const invalidCustomField = values.custom_fields.some(
    (field) => !field.label.trim() || field.options.length === 0);
  if (invalidCustomField) errors.custom_fields = ["Each custom field needs a label and at least one option."];
}

function isNonNegativeNumber(value: string): boolean {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isUrl(value: string): boolean {
  try { new URL(value); return true; } catch { return false; }
}

function buildCoordinates(latitude: string, longitude: string): CreateEventVenue["coordinates"] | undefined {
  if (!latitude.trim() && !longitude.trim()) return undefined;
  const lat = Number(latitude); const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

function buildVenue(values: CreateEventFormValues): CreateEventVenue {
  const coordinates = buildCoordinates(values.venue_latitude, values.venue_longitude);
  return { name: values.venue_name.trim(), address: values.venue_address.trim(), city: values.venue_city.trim(), ...(coordinates ? { coordinates } : {}) };
}

function toDateTimeLocal(value: string): string {
  return /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(value)?.[1] ?? "";
}

/** Serializes a datetime-local control value as the backend's timezone-less wall-clock datetime. */
function toBackendLocalDateTime(value: string): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value);
  return match ? `${match[1]}:${match[2] ?? "00"}` : value;
}
