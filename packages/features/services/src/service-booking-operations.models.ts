import { normalizeServiceBookingDetailResponse, type ServiceBookingDeliveryMode, type ServiceBookingDetail } from "./service-booking.models.ts";

export type { ServiceBookingDeliveryMode } from "./service-booking.models.ts";

export type ServiceBookingSlot = {
  starts_at: string;
  ends_at: string;
  starts_at_display: string | null;
  available: boolean;
  available_seats: number;
  capacity: number;
  reason: string | null;
};

export type ServiceBookingSlotDay = {
  date: string;
  slots: ServiceBookingSlot[];
};

export type ServiceBookingSlotsResponse = {
  service_id: string;
  service_name: string;
  time_zone: string;
  duration_minutes: number;
  capacity: number;
  delivery_modes: ServiceBookingDeliveryMode[];
  provider_id: string | null;
  provider_name: string | null;
  bookable: boolean;
  reason: string | null;
  hold_minutes: number;
  days: ServiceBookingSlotDay[];
};

export type ServiceBookingCancellationRules = {
  free_cancellation_hours: number | null;
  refund_percent_before: number | null;
  refund_percent_after: number | null;
  allow_request_after_window: boolean | null;
};

export type ServiceBookingSettings = {
  service_id: string;
  booking_enabled: boolean;
  requires_approval: boolean;
  time_zone: string;
  delivery_modes: ServiceBookingDeliveryMode[];
  cancellation_rules: ServiceBookingCancellationRules;
  cancellation_policy: string | null;
  venue_instructions: string | null;
  meeting_url: string | null;
  meeting_provider: string | null;
  meeting_passcode: string | null;
  meeting_instructions: string | null;
  max_participants: number | null;
  duration_minutes: number;
  provider_user_id: string | null;
  provider_name: string | null;
};

export type CreateServiceBookingPayload = {
  service_id: string;
  starts_at: string;
  delivery_mode?: ServiceBookingDeliveryMode;
  provider_id?: string;
  participants?: number;
  notes?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
};

export type ServiceBookingParticipantsValidation = {
  isValid: boolean;
  value: number | null;
  error: "required" | "integer" | "positive" | "capacity" | "unavailable" | null;
};

/** Validates participants against the selected slot's backend-reported remaining seats. */
export function validateServiceBookingParticipants(
  value: string,
  availableSeats: number,
): ServiceBookingParticipantsValidation {
  const normalized = value.trim();
  if (!normalized) return { isValid: false, value: null, error: "required" };
  if (!/^\d+$/.test(normalized)) return { isValid: false, value: null, error: "integer" };

  const participants = Number(normalized);
  if (!Number.isSafeInteger(participants) || participants < 1) {
    return { isValid: false, value: participants, error: "positive" };
  }
  if (!Number.isSafeInteger(availableSeats) || availableSeats < 1) {
    return { isValid: false, value: participants, error: "unavailable" };
  }
  if (participants > availableSeats) {
    return { isValid: false, value: participants, error: "capacity" };
  }

  return { isValid: true, value: participants, error: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNullableInteger(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || isInteger(value);
}

function isDeliveryMode(value: unknown): value is ServiceBookingDeliveryMode {
  return value === "in_person" || value === "virtual" || value === "hybrid";
}

/** Formats backend slot timestamps without changing the values used for booking submission. */
export function formatServiceBookingSlotTime(startsAt: string, endsAt: string, timezone: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Time unavailable";

  try {
    const formatter = new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: timezone });
    return `${formatter.format(start)} \u2013 ${formatter.format(end)}`;
  } catch {
    return "Time unavailable";
  }
}

/** Formats the backend calendar date in the Service timezone. */
export function formatServiceBookingDateHeading(date: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const calendarDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }).format(calendarDate);
  } catch {
    return date;
  }
}

/** Formats the actual backend IANA timezone into a readable label. */
export function formatServiceBookingTimezoneLabel(timezone: string): string {
  try {
    const sample = new Intl.DateTimeFormat("en-IN", { timeZone: timezone, timeZoneName: "long" }).formatToParts(new Date());
    const longName = sample.find((part) => part.type === "timeZoneName")?.value;
    const short = new Intl.DateTimeFormat("en-IN", { timeZone: timezone, timeZoneName: "short" }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;
    return longName ? `${longName}${short && short !== longName ? ` (${short})` : ""}` : timezone;
  } catch {
    return timezone;
  }
}

/** Maps confirmed backend availability codes and gives unknown codes a safe generic message. */
export function formatServiceBookingSlotReason(reason: string | null): string {
  switch (reason) {
    case "too_soon": return "Booking cutoff passed";
    case "full": return "Fully booked";
    case "provider_unavailable":
    case "provider_busy": return "Provider unavailable";
    case "too_far": return "Booking date is too far in advance";
    default: return reason ? "This slot is currently unavailable" : "Unavailable";
  }
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (!isNullableString(value)) throw new Error(`The Service Booking response field ${key} is malformed.`);
  return value ?? null;
}

function readNullableInteger(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (!isNullableInteger(value)) throw new Error(`The Service Booking response field ${key} is malformed.`);
  return value ?? null;
}

function normalizeSlot(value: unknown): ServiceBookingSlot {
  if (!isRecord(value) || !isString(value.starts_at) || !isString(value.ends_at) || typeof value.available !== "boolean" || !isInteger(value.available_seats) || value.available_seats < 0 || !isInteger(value.capacity) || value.capacity < 0) {
    throw new Error("The Service Booking slots response contains a malformed slot.");
  }

  const reason = value.reason;
  if (!isNullableString(reason)) throw new Error("The Service Booking slot reason is malformed.");

  return {
    starts_at: value.starts_at,
    ends_at: value.ends_at,
    starts_at_display: readNullableString(value, "starts_at_display"),
    available: value.available,
    available_seats: value.available_seats,
    capacity: value.capacity,
    reason: reason ?? null,
  };
}

/** Validates the documented SlotsResponse envelope without generating slots. */
export function normalizeServiceBookingSlotsResponse(value: unknown): ServiceBookingSlotsResponse {
  if (!isRecord(value) || !isString(value.service_id) || !isString(value.service_name) || !isString(value.time_zone) || !isInteger(value.duration_minutes) || !isInteger(value.capacity) || !Array.isArray(value.delivery_modes) || !value.delivery_modes.every(isDeliveryMode) || typeof value.bookable !== "boolean" || !isInteger(value.hold_minutes) || !Array.isArray(value.days)) {
    throw new Error("The Service Booking slots response is malformed.");
  }

  const reason = value.reason;
  if (!isNullableString(reason)) throw new Error("The Service Booking slots reason is malformed.");

  return {
    service_id: value.service_id,
    service_name: value.service_name,
    time_zone: value.time_zone,
    duration_minutes: value.duration_minutes,
    capacity: value.capacity,
    delivery_modes: value.delivery_modes,
    provider_id: readNullableString(value, "provider_id"),
    provider_name: readNullableString(value, "provider_name"),
    bookable: value.bookable,
    reason: reason ?? null,
    hold_minutes: value.hold_minutes,
    days: value.days.map((day) => {
      if (!isRecord(day) || !isString(day.date) || !Array.isArray(day.slots)) throw new Error("The Service Booking slots day is malformed.");
      return { date: day.date, slots: day.slots.map(normalizeSlot) };
    }),
  };
}

/** Validates the staff-only BookingSettings response. */
export function normalizeServiceBookingSettingsResponse(value: unknown): ServiceBookingSettings {
  if (!isRecord(value) || !isString(value.service_id) || typeof value.booking_enabled !== "boolean" || typeof value.requires_approval !== "boolean" || !isString(value.time_zone) || !Array.isArray(value.delivery_modes) || !value.delivery_modes.every(isDeliveryMode) || !isRecord(value.cancellation_rules) || !isInteger(value.duration_minutes)) {
    throw new Error("The Service Booking settings response is malformed.");
  }

  const rules = value.cancellation_rules;
  const allowRequest = rules.allow_request_after_window;
  if (allowRequest !== undefined && allowRequest !== null && typeof allowRequest !== "boolean") throw new Error("The Service Booking cancellation rules are malformed.");

  return {
    service_id: value.service_id,
    booking_enabled: value.booking_enabled,
    requires_approval: value.requires_approval,
    time_zone: value.time_zone,
    delivery_modes: value.delivery_modes,
    cancellation_rules: {
      free_cancellation_hours: readNullableInteger(rules, "free_cancellation_hours"),
      refund_percent_before: readNullableInteger(rules, "refund_percent_before"),
      refund_percent_after: readNullableInteger(rules, "refund_percent_after"),
      allow_request_after_window: allowRequest ?? null,
    },
    cancellation_policy: readNullableString(value, "cancellation_policy"),
    venue_instructions: readNullableString(value, "venue_instructions"),
    meeting_url: readNullableString(value, "meeting_url"),
    meeting_provider: readNullableString(value, "meeting_provider"),
    meeting_passcode: readNullableString(value, "meeting_passcode"),
    meeting_instructions: readNullableString(value, "meeting_instructions"),
    max_participants: readNullableInteger(value, "max_participants"),
    duration_minutes: value.duration_minutes,
    provider_user_id: readNullableString(value, "provider_user_id"),
    provider_name: readNullableString(value, "provider_name"),
  };
}

/** Normalizes the BookingDetail returned after a successful manual booking. */
export function normalizeCreatedServiceBooking(value: unknown): ServiceBookingDetail {
  return normalizeServiceBookingDetailResponse(value);
}
