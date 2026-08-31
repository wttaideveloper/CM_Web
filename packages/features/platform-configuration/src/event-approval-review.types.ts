export type EventVenue = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
};

export type EventTicketType = {
  id?: string;
  name: string;
  price?: string | null;
  currency?: string | null;
  capacity?: string | null;
};

export type EventSession = {
  id?: string;
  session_date?: string | null;
  title: string;
  speaker?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  meeting_link?: string | null;
};

export type EventCustomField = {
  label: string;
  type: string;
  options: string[];
};

export type EventApprovalReview = {
  id: string;
  tenant_id?: string | null;
  enterprise_id: string;
  location_id?: string | null;
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
  sessions?: EventSession[] | null;
  status: string;
  is_deleted?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalStringArray(value: unknown): value is string[] | null | undefined {
  return value === undefined || value === null || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}

function isVenue(value: unknown): value is EventVenue | null | undefined {
  return value === undefined || value === null || (isRecord(value) && isOptionalString(value.name) && isOptionalString(value.address) && isOptionalString(value.city));
}

function isTicketType(value: unknown): value is EventTicketType {
  return isRecord(value) && typeof value.name === "string" && isOptionalString(value.id) && isOptionalString(value.price) && isOptionalString(value.currency) && isOptionalString(value.capacity);
}

function isSession(value: unknown): value is EventSession {
  return isRecord(value) && typeof value.title === "string" && isOptionalString(value.id) && isOptionalString(value.session_date) && isOptionalString(value.speaker) && isOptionalString(value.start_time) && isOptionalString(value.end_time) && isOptionalString(value.location) && isOptionalString(value.meeting_link);
}

function isCustomField(value: unknown): value is EventCustomField {
  return isRecord(value) && typeof value.label === "string" && typeof value.type === "string" && Array.isArray(value.options) && value.options.every((option) => typeof option === "string");
}

function isOptionalArray<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] | null | undefined {
  return value === undefined || value === null || (Array.isArray(value) && value.every(guard));
}

/** Validates the runtime Event detail fields used by the read-only approval dossier. */
export function isEventApprovalReview(value: unknown): value is EventApprovalReview {
  return isRecord(value) && typeof value.id === "string" && typeof value.enterprise_id === "string" && typeof value.title === "string" && typeof value.category === "string" && typeof value.status === "string" && isOptionalString(value.tenant_id) && isOptionalString(value.location_id) && isOptionalString(value.enterprise_name) && isOptionalString(value.description) && isOptionalString(value.subcategory) && isOptionalStringArray(value.tags) && isOptionalString(value.organiser_name) && isOptionalString(value.organiser_contact) && isOptionalString(value.start_date) && isOptionalString(value.end_date) && isOptionalString(value.time_zone) && isOptionalString(value.registration_cutoff) && isOptionalString(value.primary_image) && isOptionalStringArray(value.gallery_images) && isOptionalStringArray(value.videos) && isOptionalStringArray(value.documents) && isOptionalString(value.delivery_mode) && isVenue(value.venue) && isOptionalString(value.meeting_link) && isOptionalString(value.meeting_provider) && isOptionalString(value.price) && isOptionalString(value.currency) && isOptionalArray(value.ticket_types, isTicketType) && isOptionalString(value.capacity) && isOptionalString(value.min_participants) && isOptionalString(value.max_participants) && isOptionalString(value.registration_open_at) && isOptionalString(value.registration_close_at) && isOptionalArray(value.custom_fields, isCustomField) && isOptionalArray(value.sessions, isSession) && (value.is_deleted === undefined || value.is_deleted === null || typeof value.is_deleted === "boolean") && isOptionalString(value.created_at) && isOptionalString(value.updated_at);
}
