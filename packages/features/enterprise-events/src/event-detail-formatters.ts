/** Converts empty nullable scalar values into a consistent detail-page label. */
export function displayValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
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

/** Formats attendance audit timestamps without assigning a timezone to offset-less values. */
export function formatAttendanceAuditDateTime(value: string | null | undefined, timeZone: string): string {
  if (!value) {
    return "Not provided";
  }

  const hasExplicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  if (!hasExplicitOffset) {
    const localMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value);
    return localMatch ? `${localMatch[1]} ${localMatch[2]}` : value;
  }

  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return `${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone }).format(parsed)} (${timeZone})`;
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
