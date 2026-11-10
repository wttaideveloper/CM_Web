import type { TaxExemptionResponse, TaxRuleResponse, TaxHistoryParams } from "@ihp/commerce";

export type TaxRuleFilters = { search: string; country: string; taxType: string; status: "all" | "active" | "inactive" };

/** Filters the complete Tax Rules collection returned by the unpaginated rules endpoint. */
export function filterBackendTaxRules(rules: readonly TaxRuleResponse[], filters: TaxRuleFilters): readonly TaxRuleResponse[] {
  const search = filters.search.trim().toLowerCase();
  return rules.filter((rule) => {
    const matchesSearch = !search || `${rule.id} ${rule.name} ${rule.country} ${rule.state ?? ""} ${rule.applies_to} ${rule.tax_type}`.toLowerCase().includes(search);
    const matchesCountry = filters.country === "all" || rule.country === filters.country;
    const matchesType = filters.taxType === "all" || rule.tax_type === filters.taxType;
    const matchesStatus = filters.status === "all" || (filters.status === "active" ? rule.is_active : !rule.is_active);
    return matchesSearch && matchesCountry && matchesType && matchesStatus;
  });
}

/** Masks a backend registration number while retaining only its final four characters. */
export function maskTaxRegistrationNumber(value: string): string {
  if (!value) return "Not supplied";
  const visible = value.slice(-4);
  return `${"•".repeat(Math.max(4, value.length - visible.length))}${visible}`;
}

/** Builds only deployed tax-history filters and converts browser-local date/time inputs to RFC3339. */
export function buildTaxHistoryParams(filters: {
  country: string;
  taxType: string;
  tenantId: string;
  paymentId: string;
  from: string;
  to: string;
  page: number;
}, pageSize: number): TaxHistoryParams {
  const toUtc = (value: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };
  return {
    country: filters.country || undefined,
    tax_type: filters.taxType || undefined,
    tenant_id: filters.tenantId || undefined,
    payment_id: filters.paymentId || undefined,
    date_from: toUtc(filters.from),
    date_to: toUtc(filters.to),
    page: filters.page,
    page_size: pageSize,
  };
}

/** Returns a jurisdiction label without inventing absent location fields. */
export function exemptionJurisdiction(exemption: TaxExemptionResponse): string {
  return [exemption.country, exemption.state].filter(Boolean).join(" / ");
}

/** Creates an isolated cache key for the selected rule's authoritative versions. */
export function taxRuleVersionsQueryKey(ruleId: string | null) {
  return ["platform-commerce", "tax", "rule-versions", ruleId] as const;
}

/** Provides an honest prompt when the empty rules result leaves no selectable rule. */
export function taxRuleVersionHistoryDescription(rule: TaxRuleResponse | null): string {
  return rule
    ? `Authoritative read-only versions for ${rule.name} (${rule.id}).`
    : "Select a rule using View versions above to load its backend history. No rules are currently available to select.";
}

/** Selects only backend-supplied version fields for read-only presentation. */
export function taxRuleVersionDetails(rule: TaxRuleResponse) {
  return {
    id: rule.id,
    version: rule.version,
    name: rule.name,
    taxType: rule.tax_type,
    rate: rule.rate,
    appliesTo: rule.applies_to,
    effectiveFrom: rule.valid_from,
    effectiveTo: rule.valid_to,
    active: rule.is_active,
    current: rule.is_current,
    createdAt: rule.created_at,
    createdBy: rule.created_by,
    notes: rule.notes,
    supersedesId: rule.supersedes_id,
  };
}
