import type { TaxRuleResponse } from "@ihp/commerce";

export interface TaxRuleDraft {
  tax_type: string;
  name: string;
  country: string;
  state: string;
  rate: string;
  applies_to: string;
  condition: string;
  rounding_mode: string;
  reverse_charge_allowed: boolean;
  valid_from: string;
}

export type TaxRuleDraftErrorCode = "requiredName" | "invalidTaxType" | "requiredCountry" | "invalidRate" | "invalidAppliesTo" | "requiredCondition" | "requiredRoundingMode" | "invalidValidFrom";
export type TaxRuleDraftErrors = Partial<Record<keyof TaxRuleDraft, TaxRuleDraftErrorCode>>;

export const TAX_RULE_TAX_TYPES = ["GST", "VAT", "sales_tax", "service_tax"] as const;
export const TAX_RULE_APPLIES_TO = ["all", "product", "standard", "reduced", "zero_rate"] as const;

/** Creates an empty draft or copies a backend rule into a new-version edit draft. */
export function createTaxRuleDraft(rule?: TaxRuleResponse): TaxRuleDraft {
  return {
    tax_type: rule?.tax_type ?? "",
    name: rule?.name ?? "",
    country: rule?.country ?? "",
    state: rule?.state ?? "",
    rate: rule?.rate ?? "",
    applies_to: rule?.applies_to ?? "",
    condition: rule?.condition ?? "",
    rounding_mode: rule?.rounding_mode ?? "",
    reverse_charge_allowed: rule?.reverse_charge_allowed ?? false,
    valid_from: rule?.valid_from ?? "",
  };
}

/** Validates only safe client-side syntax; backend remains authoritative for tax-rule semantics. */
export function validateTaxRuleDraft(draft: TaxRuleDraft, allowedAppliesTo: readonly string[] = TAX_RULE_APPLIES_TO): TaxRuleDraftErrors {
  const errors: TaxRuleDraftErrors = {};
  if (!draft.name.trim()) errors.name = "requiredName";
  if (!draft.tax_type.trim() || !TAX_RULE_TAX_TYPES.includes(draft.tax_type as typeof TAX_RULE_TAX_TYPES[number])) {
    errors.tax_type = "invalidTaxType";
  }
  if (!draft.country.trim()) errors.country = "requiredCountry";
  if (!/^\d+(?:\.\d+)?$/.test(draft.rate.trim())) errors.rate = "invalidRate";
  if (!draft.applies_to.trim() || !allowedAppliesTo.includes(draft.applies_to)) errors.applies_to = "invalidAppliesTo";
  if (!draft.condition.trim()) errors.condition = "requiredCondition";
  if (!draft.rounding_mode.trim()) errors.rounding_mode = "requiredRoundingMode";
  if (!draft.valid_from.trim() || !Number.isFinite(Date.parse(draft.valid_from))) errors.valid_from = "invalidValidFrom";
  return errors;
}

/** Returns unique applicability values while retaining a backend-defined current class. */
export function taxRuleAppliesToOptions(currentValue?: string): string[] {
  return currentValue && !TAX_RULE_APPLIES_TO.includes(currentValue as typeof TAX_RULE_APPLIES_TO[number])
    ? [...TAX_RULE_APPLIES_TO, currentValue]
    : [...TAX_RULE_APPLIES_TO];
}
