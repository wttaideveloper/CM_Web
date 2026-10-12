import type { Event } from "./events.service";
import { eventDateTimeToEpoch } from "./event-time-filters";

export type WalkInEligibilityEvent = Omit<
  Pick<
    Event,
    | "status"
    | "time_zone"
    | "registration_open"
    | "registration_open_at"
    | "registration_close_at"
    | "registration_cutoff"
    | "is_full"
    | "available_seats"
    | "modules"
  >,
  "modules"
> & { modules?: { registration?: boolean | null } | null };

export type WalkInEligibilityReason =
  | "registration_module_disabled"
  | "event_cancelled"
  | "event_completed"
  | "event_status_unavailable"
  | "registration_not_open"
  | "registration_closed"
  | "registration_timing_unavailable"
  | "event_full"
  | "capacity_unavailable"
  | "available";

export interface WalkInEligibility {
  allowed: boolean;
  reason: WalkInEligibilityReason;
  message: string;
}

const unavailable = (reason: Exclude<WalkInEligibilityReason, "available">, message: string): WalkInEligibility => ({
  allowed: false,
  reason,
  message,
});

/**
 * Determines whether a new walk-in may be started from the current Event snapshot.
 * Event-local schedule values are compared in the Event's timezone, never the browser timezone.
 */
export function getWalkInEligibility(event: WalkInEligibilityEvent, now: Date = new Date()): WalkInEligibility {
  if (event.modules?.registration === false) {
    return unavailable("registration_module_disabled", "Walk-in registration is disabled for this Event.");
  }
  if (event.status === "cancelled") {
    return unavailable("event_cancelled", "Walk-in registration is unavailable because this Event is cancelled.");
  }
  if (event.status === "completed") {
    return unavailable("event_completed", "Walk-in registration is unavailable because this Event is completed.");
  }
  if (event.status !== "published" && event.status !== "suspended") {
    return unavailable("event_status_unavailable", "Walk-in registration is unavailable for this Event status.");
  }

  const nowValue = now.getTime();
  if (!Number.isFinite(nowValue)) {
    return unavailable("registration_timing_unavailable", "Registration timing is unavailable. Refresh and try again.");
  }
  if (event.registration_open === false) {
    return unavailable("registration_closed", "Registration is closed for this Event.");
  }

  const openingValue = event.registration_open_at.trim();
  if (openingValue) {
    const opening = eventDateTimeToEpoch(openingValue, event.time_zone);
    if (opening === null) {
      return unavailable("registration_timing_unavailable", "Registration timing is unavailable. Refresh and try again.");
    }
    if (nowValue < opening) {
      return unavailable("registration_not_open", "Registration has not opened for this Event.");
    }
  } else if (event.registration_open !== true) {
    return unavailable("registration_timing_unavailable", "Registration timing is unavailable. Refresh and try again.");
  }

  const closingValues = [event.registration_cutoff, event.registration_close_at].map((value) => value.trim()).filter(Boolean);
  if (closingValues.length === 0) {
    return unavailable("registration_timing_unavailable", "Registration timing is unavailable. Refresh and try again.");
  }
  const closingTimes = closingValues.map((value) => eventDateTimeToEpoch(value, event.time_zone));
  if (closingTimes.some((value) => value === null)) {
    return unavailable("registration_timing_unavailable", "Registration timing is unavailable. Refresh and try again.");
  }
  const closing = Math.min(...closingTimes as number[]);
  if (nowValue >= closing) {
    return unavailable("registration_closed", "Registration is closed for this Event.");
  }

  if (event.is_full === true || (event.available_seats !== null && event.available_seats <= 0)) {
    return unavailable("event_full", "This Event is full. Walk-in registration is unavailable.");
  }
  if (event.is_full !== false && event.available_seats === null) {
    return unavailable("capacity_unavailable", "Event capacity is unavailable. Refresh and try again.");
  }

  return { allowed: true, reason: "available", message: "Walk-in registration is available." };
}
