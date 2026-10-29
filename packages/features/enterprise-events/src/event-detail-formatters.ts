import { normalizeUtcDate } from "./event-reviews.service";

/** Converts empty nullable scalar values into a consistent detail-page label. */
export function displayValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}
/** Converts backend delivery-mode values into user-facing labels. */
export function formatEventDeliveryMode(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "online") return "Online";
  if (normalized === "in_person" || normalized === "in-person") return "In Person";
  if (normalized === "hybrid") return "Hybrid";
  return displayValue(value);
}

/** Converts backend duration values into user-facing labels. */
export function formatEventDurationType(value: string | null | undefined): string {
  if (!value?.trim()) return "Not provided";
  return value.trim().toLowerCase() === "custom" ? "Custom" : value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Formats confirmed UTC audit timestamps in the browser's local timezone. */
export function formatAuditDateTime(value: string | null | undefined, timeZone?: string): string {
  const normalized = normalizeUtcDate(value);
  if (!normalized) return "Not provided";

  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(parsed);
}

/** Formats an Event datetime while preserving a backend-provided local wall-clock time. */
export function formatEventDateTime(value: string | null | undefined, timeZone: string): string {
  if (!value) {
    return "Not provided";
  }

  const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value);
  if (localMatch) {
    const [, year, month, day, time] = localMatch;
    return `${day}/${month}/${year}, ${time} (${timeZone})`;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return `${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone }).format(parsed)} (${timeZone})`;
}

function parseEventScheduleDate(value: string, timeZone: string): { date: Date; displayTimeZone: string } | null {
  const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/.exec(value);
  if (localMatch) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", fractionText = ""] = localMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const millisecond = Number((fractionText + "000").slice(0, 3));
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day ||
      date.getUTCHours() !== hour ||
      date.getUTCMinutes() !== minute ||
      date.getUTCSeconds() !== second
    ) {
      return null;
    }

    // Event schedule values are wall-clock values. UTC is only used as a neutral
    // formatting zone so the browser cannot shift the Event's local time.
    return { date, displayTimeZone: "UTC" };
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? { date, displayTimeZone: timeZone } : null;
}

/** Formats an Event-local schedule value for compact, prominent UI display. */
export function formatEventScheduleDateTime(value: string | null | undefined, timeZone: string): string {
  if (!value?.trim()) {
    return "Not specified";
  }

  const parsed = parseEventScheduleDate(value.trim(), timeZone);
  if (!parsed) {
    return "Not specified";
  }

  const parts = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: parsed.displayTimeZone,
  }).formatToParts(parsed.date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("day")} ${getPart("month")} ${getPart("year")} · ${getPart("hour")}:${getPart("minute")} ${getPart("dayPeriod")}`.trim();
}

/** Formats UTC attendance audit timestamps in the browser's local timezone. */
export function formatAttendanceAuditDateTime(value: string | null | undefined, _eventTimeZone?: string): string {
  return formatAuditDateTime(value);
}

/** Returns the date-only portion of an Event datetime for the schedule detail grid. */
export function formatEventDate(value: string | null | undefined, timeZone: string): string {
  const formatted = formatEventDateTime(value, timeZone);
  return formatted === "Not provided" ? formatted : formatted.split(", ")[0] ?? formatted;
}

/** Returns the time-only portion of an Event datetime for the schedule detail grid. */
export function formatEventTime(value: string | null | undefined, timeZone: string): string {
  const formatted = formatEventDateTime(value, timeZone);
  if (formatted === "Not provided") {
    return formatted;
  }

  const parts = formatted.split(", ");
  return parts.slice(1).join(", ") || formatted;
}
