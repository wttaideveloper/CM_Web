export interface TrainingReferenceOption {
  value: string;
  label: string;
}

const TIME_ZONE_VALUES = [...new Set([...Intl.supportedValuesOf("timeZone"), "Asia/Kolkata"])].sort();
const CURRENCY_VALUES = Intl.supportedValuesOf("currency");

/** Returns a local datetime minimum for Training scheduling while preserving an existing past value during edits. */
export function getTrainingDateTimeMinimum(existingValue = ""): string {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const normalizedExisting = existingValue.slice(0, 16);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedExisting) && normalizedExisting < localNow
    ? normalizedExisting
    : localNow;
}

/** Returns a local date minimum for Training date fields while preserving an existing past value during edits. */
export function getTrainingDateMinimum(existingValue = ""): string {
  const now = new Date();
  const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const normalizedExisting = existingValue.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedExisting) && normalizedExisting < localToday
    ? normalizedExisting
    : localToday;
}

/** Returns the browser-supported IANA time zones and preserves a legacy current value. */
export function getTrainingTimeZoneOptions(currentValue = ""): TrainingReferenceOption[] {
  const values = currentValue && !TIME_ZONE_VALUES.includes(currentValue)
    ? [...TIME_ZONE_VALUES, currentValue]
    : TIME_ZONE_VALUES;
  return values.map((value) => ({ value, label: value }));
}

/** Returns the browser-supported ISO currency codes with localized names and preserves a legacy value. */
export function getTrainingCurrencyOptions(currentValue = "", locale?: string): TrainingReferenceOption[] {
  const values = currentValue && !CURRENCY_VALUES.includes(currentValue)
    ? [...CURRENCY_VALUES, currentValue]
    : CURRENCY_VALUES;
  const names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: "currency" });
  return values.map((value) => ({ value, label: `${value} — ${names.of(value) ?? value}` }));
}

/** Keeps a configured Training reference value selectable when it is absent from Super Admin options. */
export function preserveTrainingReferenceValue(
  options: readonly TrainingReferenceOption[],
  currentValue: string,
): TrainingReferenceOption[] {
  return currentValue && !options.some((option) => option.value === currentValue)
    ? [...options, { value: currentValue, label: currentValue }]
    : [...options];
}
