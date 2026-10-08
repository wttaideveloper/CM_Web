/** Backend-confirmed limits for Event fields that are not fully described by form configuration. */
export const EVENT_DESCRIPTION_MAX_LENGTH = 300;
export const MEAL_OPTION_NAME_MAX_LENGTH = 100;
export const MEAL_OPTION_DESCRIPTION_MAX_LENGTH = 300;
export const ACCOMMODATION_OPTION_NAME_MAX_LENGTH = 100;
export const ACCOMMODATION_OPTION_DESCRIPTION_MAX_LENGTH = 300;

export type EventServiceKind = "meals" | "accommodation";
export type EventServiceTextField = "name" | "description";

/** Returns the backend-confirmed maximum for an Event service text field. */
export function eventServiceOptionMaxLength(kind: EventServiceKind, field: EventServiceTextField): number {
  if (field === "name") return kind === "meals" ? MEAL_OPTION_NAME_MAX_LENGTH : ACCOMMODATION_OPTION_NAME_MAX_LENGTH;
  return kind === "meals" ? MEAL_OPTION_DESCRIPTION_MAX_LENGTH : ACCOMMODATION_OPTION_DESCRIPTION_MAX_LENGTH;
}

/** Returns an inline validation message when a service text field exceeds its backend limit. */
export function eventServiceOptionLengthError(kind: EventServiceKind, field: EventServiceTextField, value: string): string | undefined {
  const limit = eventServiceOptionMaxLength(kind, field);
  if (value.length <= limit) return undefined;
  const label = `${kind === "meals" ? "Meal" : "Accommodation"} option ${field}`;
  return `${label} must be ${limit} characters or fewer.`;
}

/** Returns the authoritative maximum length for a core Event field, when one is known. */
export function eventCoreMaxLength(key: string): number | undefined {
  if (key === "description") return EVENT_DESCRIPTION_MAX_LENGTH;
  return undefined;
}

/** Combines an authoritative core limit with a configured limit without weakening either one. */
export function eventFieldMaxLength(key: string, configuredMaxLength?: number | null): number | undefined {
  const limits = [eventCoreMaxLength(key), configuredMaxLength].filter((value): value is number => value != null && value > 0);
  return limits.length ? Math.min(...limits) : undefined;
}
