/** Adds an explicit UTC zone to audit timestamps when the server omits one. */
export function normalizeUtcAuditDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const timestamp = value.trim();
  return /^\d{4}-\d{2}-\d{2}T/.test(timestamp) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)
    ? `${timestamp}Z`
    : timestamp;
}

/** Formats confirmed UTC audit timestamps in the browser's local timezone. */
export function formatAuditDateTime(value: string | null | undefined, timeZone?: string): string {
  const normalized = normalizeUtcAuditDate(value);
  if (!normalized) return "Not provided";

  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(parsed);
}

/** Returns a stable sort value for an audit timestamp, with invalid values last. */
export function auditTimestampValue(value: string | null | undefined): number {
  const normalized = normalizeUtcAuditDate(value);
  if (!normalized) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
