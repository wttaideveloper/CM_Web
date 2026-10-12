const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns a safe approval actor label without exposing an internal UUID as a person's name. */
export function approvalActorDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  const normalized = candidate.toLowerCase();
  if (
    !candidate ||
    UUID_PATTERN.test(candidate) ||
    EMAIL_PATTERN.test(candidate) ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "unknown user" ||
    normalized === "n/a"
  ) {
    return null;
  }

  return candidate;
}
