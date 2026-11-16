import type { AvailabilityScheduleItem } from "./types/service.types";

/** Local schedule shape shared by the create and edit controls. */
export type ServiceScheduleDraft = {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotLength: string;
};

/** Backend-compatible schedule input used by the pure validation utility. */
export type ServiceScheduleValidationEntry = {
  day?: string | null;
  is_available?: boolean | null;
  start_time?: string | null;
  end_time?: string | null;
  slot_length?: string | number | null;
};

export type ServiceScheduleValidationResult = {
  isValid: boolean;
  fieldErrors: Record<string, string>;
};

export type ServiceScheduleReviewRow = {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotLength: string;
};

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function normalizedValue(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function scheduleErrorKey(day: string | null, index: number): string {
  return day?.toLowerCase() || `entry-${index}`;
}

function validatePositiveSlotLength(value: string | number | null | undefined): string | null {
  const normalized = typeof value === "number" ? String(value) : normalizedValue(value);
  const parsed = Number(normalized);

  if (!normalized || !Number.isFinite(parsed) || parsed <= 0) {
    return "Enter a positive slot duration in minutes.";
  }

  return null;
}

/** Builds the unchanged API schedule shape from create/edit weekday state. */
export function buildServiceAvailabilitySchedule(
  days: readonly ServiceScheduleDraft[],
): AvailabilityScheduleItem[] {
  return days
    .filter((day) => day.enabled)
    .map((day) => ({
      day: day.day.toLowerCase(),
      is_available: true,
      start_time: day.startTime,
      end_time: day.endTime,
      slot_length: day.slotLength,
    }));
}

/** Builds the complete Monday-to-Sunday view used by the local Create review step. */
export function buildServiceScheduleReviewRows(
  days: readonly ServiceScheduleDraft[],
): ServiceScheduleReviewRow[] {
  const rows = [...days];
  return WEEKDAY_ORDER.map((weekday) => rows.find((day) => day.day.trim().toLowerCase() === weekday))
    .filter((day): day is ServiceScheduleDraft => Boolean(day))
    .map((day) => ({
      day: day.day,
      enabled: day.enabled,
      startTime: day.startTime.trim(),
      endTime: day.endTime.trim(),
      slotLength: day.slotLength.trim(),
    }));
}

/**
 * Validates enabled schedule entries against the documented field formats.
 * Time ordering is intentionally not constrained because the backend contract
 * does not define whether an end time before the start time is overnight.
 */
export function validateServiceSchedule(
  entries: readonly ServiceScheduleValidationEntry[],
): ServiceScheduleValidationResult {
  const fieldErrors: Record<string, string> = {};

  entries.forEach((entry, index) => {
    if (entry.is_available === false) {
      return;
    }

    const day = normalizedValue(entry.day) || null;
    const errors: string[] = [];
    const startTime = normalizedValue(entry.start_time);
    const endTime = normalizedValue(entry.end_time);

    if (!day) {
      errors.push("Choose a day.");
    }

    if (!startTime) {
      errors.push("Start time is required.");
    } else if (!TIME_PATTERN.test(startTime)) {
      errors.push("Start time must use HH:MM format.");
    }

    if (!endTime) {
      errors.push("End time is required.");
    } else if (!TIME_PATTERN.test(endTime)) {
      errors.push("End time must use HH:MM format.");
    }

    const slotLengthError = validatePositiveSlotLength(entry.slot_length);
    if (slotLengthError) {
      errors.push(slotLengthError);
    }

    if (errors.length > 0) {
      fieldErrors[scheduleErrorKey(day, index)] = errors.join(" ");
    }
  });

  return { isValid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

/** Validates optional maximum capacity using the backend integer contract. */
export function validateMaxParticipants(value: string | number | null | undefined): string | null {
  const normalized = typeof value === "number" ? String(value) : normalizedValue(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return "Maximum participants must be a positive whole number.";
  }

  return null;
}

/** Parses a validated optional maximum capacity for the existing payload shape. */
export function parseOptionalMaxParticipants(value: string): number | undefined {
  if (validateMaxParticipants(value)) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? Number(normalized) : undefined;
}
