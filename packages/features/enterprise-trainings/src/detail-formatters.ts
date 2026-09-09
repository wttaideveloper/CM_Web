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

/** Returns the date-only portion of a datetime. */
export function formatDetailDate(value: string | null | undefined): string {
  const formatted = formatDetailDateTime(value);
  return formatted === "Not provided" ? formatted : formatted.split(", ")[0] ?? formatted;
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