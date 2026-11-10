import type { CommerceJsonValue, CommerceOverview, CommerceRecord } from "@ihp/commerce";

/** Draft filter values exposed by the Overview controls. */
export type OverviewFilterValues = {
  from: string;
  to: string;
  enterprise: string;
};

/** Supported query parameters for the deployed Overview report endpoint. */
export type OverviewQueryParams = {
  date_from?: string;
  date_to?: string;
  tenant_id?: string;
};

/** One backend aggregate rendered by a KPI card without local arithmetic. */
export type OverviewMetric = {
  count: string | null;
  total: string | null;
};

/** Converts UI filter values to the exact report endpoint parameter names. */
export function buildOverviewQueryParams(filters: OverviewFilterValues): OverviewQueryParams {
  return {
    ...(filters.from ? { date_from: filters.from } : {}),
    ...(filters.to ? { date_to: filters.to } : {}),
    ...(filters.enterprise.trim() ? { tenant_id: filters.enterprise.trim() } : {}),
  };
}

function isRecord(value: CommerceJsonValue | undefined): value is CommerceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function displayValue(value: CommerceJsonValue | undefined): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

/** Maps one backend aggregate directly to a display value without calculating it locally. */
export function getOverviewMetric(
  overview: CommerceOverview,
  category: keyof Pick<CommerceOverview, "payments" | "refunds" | "tax" | "settlements">,
  field: "paid" | "waiting" | "failed" | "total" | "pending" | "base_collected",
): OverviewMetric {
  const record = overview[category];
  const value = displayValue(record[field]);
  return category === "tax" ? { count: null, total: value } : { count: value, total: null };
}

/** Formats one already-authoritative backend aggregate for display. */
export function formatMetricValue(metric: OverviewMetric): string {
  if (metric.count !== null && metric.total !== null) return `${metric.count} · ${metric.total}`;
  return metric.count ?? metric.total ?? "Not supplied";
}

/** A labeled backend attention count shown on the Overview page. */
export type NeedsAttentionMetric = {
  label: string;
  value: string;
};

const NEEDS_ATTENTION_FIELDS = [
  ["payments_under_review", "Payments under review"],
  ["payments_needing_reconciliation", "Payments needing reconciliation"],
  ["refunds_overdue", "Refunds overdue"],
  ["refunds_failed", "Refunds failed"],
  ["settlements_failed", "Settlements failed"],
  ["settlements_on_hold", "Settlements on hold"],
  ["open_reconciliation_mismatches", "Open reconciliation mismatches"],
] as const;

/** Reads the backend-provided attention counts and preserves zero values. */
export function getNeedsAttentionMetrics(value: CommerceJsonValue): readonly NeedsAttentionMetric[] {
  if (!isRecord(value)) return [];
  return NEEDS_ATTENTION_FIELDS.map(([field, label]) => ({ label, value: displayValue(value[field]) ?? "Not supplied" }));
}
