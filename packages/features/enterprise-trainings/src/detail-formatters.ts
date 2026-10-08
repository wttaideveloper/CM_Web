/** Converts empty nullable scalar values into a consistent detail-page label. */
export function displayValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }
  return String(value);
}

/** Humanizes snake_case / kebab-case backend values for display. */
export function humanizeLabel(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, " ");
  return normalized ? normalized.replace(/\b\w/g, (character) => character.toUpperCase()) : "Not provided";
}

/** Formats a datetime, preserving backend-provided local wall-clock times. */
export function formatDetailDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not provided";
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

/** Finds the timestamp from supported moderation-history response field names. */
export function getTrainingModerationTimestamp(record: Record<string, unknown>): string | null {
  const timestampFields = [
    "created_at",
    "performed_at",
    "timestamp",
    "createdAt",
    "performedAt",
    "reviewed_at",
    "changed_at",
    "created_on",
    "updated_at",
    "updated_on",
    "updatedAt",
    "action_at",
    "actionAt",
    "date_time",
    "datetime",
    "reviewed_on",
    "activity_at",
    "occurred_at",
    "event_at",
    "decision_at",
  ];

  for (const field of timestampFields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) return date.toISOString();
    }
  }

  for (const field of ["metadata", "details", "audit", "event"]) {
    const nested = record[field];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const timestamp = getTrainingModerationTimestamp(nested as Record<string, unknown>);
      if (timestamp) return timestamp;
    }
  }

  return null;
}

/** Returns the date-only portion of a datetime. */
export function formatDetailDate(value: string | null | undefined): string {
  const formatted = formatDetailDateTime(value);
  return formatted === "Not provided" ? formatted : formatted.split(", ")[0] ?? formatted;
}

/** Formats the Training schedule date without timezone conversion, preserving the date selected by the owner. */
export function formatTrainingScheduleDate(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[2]}-${isoDate[3]}-${isoDate[1]}`;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed)
    : value;
}

/** Formats an API time value for the Training schedule while preserving unrecognized legacy values. */
export function formatTrainingScheduleTime(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const time = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!time) return value;
  const hours = Number(time[1]);
  const minutes = Number(time[2]);
  if (hours > 23 || minutes > 59) return value;
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

/** Formats a currency amount, leaving backend strings untouched when the value is not numeric. */
export function formatDetailPrice(price: string | null | undefined, currency: string | null | undefined): string {
  if (!price) {
    return "Not provided";
  }
  const amount = Number(price);
  if (!Number.isFinite(amount)) {
    return currency ? `${price} ${currency}`.trim() : price;
  }
  return currency
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: currency || undefined }).format(amount)
    : String(amount);
}

/** Training-specific datetime/price aliases kept for reader clarity. */
export const formatTrainingDateTime = formatDetailDateTime;
export const formatTrainingDate = formatDetailDate;
export const formatTrainingPrice = formatDetailPrice;

/** Program-specific datetime/price aliases kept for reader clarity. */
export const formatProgramDateTime = formatDetailDateTime;
export const formatProgramDate = formatDetailDate;
export const formatProgramPrice = formatDetailPrice;
