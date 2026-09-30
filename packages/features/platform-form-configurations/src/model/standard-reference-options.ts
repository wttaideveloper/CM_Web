import type { FormFieldOption } from "./form-configuration.types";

export type StandardReferenceField = "currency" | "time_zone";

/** Returns canonical, supported values that can be assigned to a configured Training reference field. */
export function getStandardReferenceOptions(
  field: StandardReferenceField,
): FormFieldOption[] {
  const values = field === "currency"
    ? Intl.supportedValuesOf("currency")
    : Intl.supportedValuesOf("timeZone");
  const currencyNames = field === "currency"
    ? new Intl.DisplayNames(["en"], { type: "currency" })
    : null;

  return values.map((value, index) => ({
    value,
    label: field === "currency"
      ? `${value} — ${currencyNames?.of(value) ?? value}`
      : value,
    position: index + 1,
  }));
}
