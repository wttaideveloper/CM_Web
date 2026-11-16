import type { ServiceDto, ServiceGeneratedAvailabilityDay } from "./types/service.types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * Normalizes optional generated Service availability without inventing slots.
 * Invalid entries are omitted while valid empty-slot days remain displayable.
 */
export function normalizeServiceGeneratedAvailability(
  value: unknown,
): ServiceGeneratedAvailabilityDay[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const day = readNonEmptyString(entry.day);
    const date = readNonEmptyString(entry.date);

    if (!day || !date || !isDateOnly(date)) {
      return [];
    }

    const slots = Array.isArray(entry.slots)
      ? entry.slots.flatMap((slot) => {
          const normalizedSlot = readNonEmptyString(slot);
          return normalizedSlot ? [normalizedSlot] : [];
        })
      : [];

    return [{ day, date, slots }];
  });
}

/**
 * Formats a contract date-only value without applying a browser timezone shift.
 * The UTC formatter is intentional because the backend field has no time zone.
 */
export function formatServiceAvailabilityDate(value: string, locale?: string): string | null {
  const normalizedValue = value.trim();

  if (!isDateOnly(normalizedValue)) {
    return null;
  }

  const [year, month, day] = normalizedValue.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Normalizes the optional generated availability on a Service detail response.
 */
export function normalizeServiceDetailResponse(value: unknown): ServiceDto {
  if (!isRecord(value)) {
    throw new Error("Invalid Service detail response.");
  }

  return {
    ...value,
    availability: normalizeServiceGeneratedAvailability(value.availability),
  } as ServiceDto;
}
