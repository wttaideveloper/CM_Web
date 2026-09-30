export interface TrainingReferenceOption {
  value: string;
  label: string;
}

const TIME_ZONE_VALUES = Intl.supportedValuesOf("timeZone");
const CURRENCY_VALUES = Intl.supportedValuesOf("currency");

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
