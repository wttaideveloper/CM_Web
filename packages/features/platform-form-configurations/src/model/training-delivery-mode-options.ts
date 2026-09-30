import type { ConfiguredField, FormFieldOption } from "./form-configuration.types";

export const TRAINING_DELIVERY_MODE_OPTIONS: readonly FormFieldOption[] = [
  { value: "hybrid", label: "Hybrid", position: 1 },
  { value: "physical", label: "Physical", position: 2 },
  { value: "online", label: "Online", position: 3 },
  { value: "self_paced", label: "Self-paced", position: 4 },
];

/** Identifies a Training delivery-mode field from its API, builder, or display identity. */
export function isTrainingDeliveryModeField(
  field: Pick<ConfiguredField, "source" | "coreKey" | "stableKey" | "label">,
): boolean {
  const identifiers = [field.coreKey, field.stableKey]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase().replace(/^(core_|custom_)/, ""));

  return identifiers.some((value) => value === "delivery_mode" || value.endsWith("_delivery_mode"))
    || field.label.trim().toLowerCase() === "delivery mode";
}
