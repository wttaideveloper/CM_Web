export const taxTypes = ["GST", "VAT", "Sales Tax", "Service Tax"] as const;
export type TaxType = (typeof taxTypes)[number];

export const taxRuleStatuses = ["all", "draft", "active", "retired"] as const;
export type TaxRuleStatusFilter = (typeof taxRuleStatuses)[number];

export const exemptionStatuses = ["all", "pending", "approved", "rejected", "expired", "revoked"] as const;
export type ExemptionStatusFilter = (typeof exemptionStatuses)[number];

export type TaxRulePreview = {
  id: string;
  name: string;
  country: string;
  region: string;
  taxType: TaxType;
  percentage: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: Exclude<TaxRuleStatusFilter, "all">;
};

export type TaxClassPreview = {
  name: string;
  linkedRules: string;
  offeringCategories: string;
  enterprises: string;
  status: "illustrative";
};

export type TaxExemptionPreview = {
  id: string;
  status: Exclude<ExemptionStatusFilter, "all">;
  customer: string;
  jurisdiction: string;
  taxIdentifier: string;
  effectivePeriod: string;
};

export const taxRulePreviews: readonly TaxRulePreview[] = [];

/** Labels only; these are not configured tax classes. */
export const taxClassPreviews: readonly TaxClassPreview[] = [
  { name: "Standard Rated", linkedRules: "Not configured", offeringCategories: "Not configured", enterprises: "Not configured", status: "illustrative" },
  { name: "Zero Rated", linkedRules: "Not configured", offeringCategories: "Not configured", enterprises: "Not configured", status: "illustrative" },
  { name: "Exempt", linkedRules: "Not configured", offeringCategories: "Not configured", enterprises: "Not configured", status: "illustrative" },
];

export const taxExemptionPreviews: readonly TaxExemptionPreview[] = [];

export function filterTaxRules(
  rules: readonly TaxRulePreview[],
  search: string,
  country: string,
  taxType: TaxType | "all",
  status: TaxRuleStatusFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();
  return rules.filter((rule) => {
    const matchesSearch = !normalizedSearch || `${rule.name} ${rule.country} ${rule.region}`.toLowerCase().includes(normalizedSearch);
    const matchesCountry = country === "all" || rule.country === country;
    const matchesType = taxType === "all" || rule.taxType === taxType;
    const matchesStatus = status === "all" || rule.status === status;
    return matchesSearch && matchesCountry && matchesType && matchesStatus;
  });
}

export function filterTaxExemptions(exemptions: readonly TaxExemptionPreview[], status: ExemptionStatusFilter) {
  return exemptions.filter((exemption) => status === "all" || exemption.status === status);
}

export const taxPreviewMutationsDisabled = true;
