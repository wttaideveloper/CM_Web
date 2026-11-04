import type {
  AuditListParams,
  CurrencyReportParams,
  ExchangeRateReportParams,
  PaymentReportParams,
  ReconciliationReportParams,
  RefundReportParams,
  SettlementReportParams,
  TaxReportParams,
} from "@ihp/commerce";

export const reportCategories = [
  "payments",
  "refunds",
  "currencies",
  "tax",
  "settlements",
  "exchange-rates",
  "reconciliation",
  "finance-audit",
] as const;

export type ReportCategory = (typeof reportCategories)[number];

/** Payment Reports is the initially selected tab, so its query panel mounts on page entry. */
export const defaultReportCategory: ReportCategory = "payments";

/** Backend paths represented by each report tab; reconciliation intentionally has two separate resources. */
export const reportEndpointPaths: Record<ReportCategory, readonly string[]> = {
  payments: ["/payment-reports/payments"],
  refunds: ["/payment-reports/refunds"],
  currencies: ["/payment-reports/currency"],
  tax: ["/tax/reports"],
  settlements: ["/payment-reports/settlements"],
  "exchange-rates": ["/payment-reports/exchange-rates"],
  reconciliation: ["/payment-reports/reconciliation", "/finance/reconciliation", "/finance/reconciliation/{run_id}"],
  "finance-audit": ["/finance/audit"],
};

/** Revalidates cached data whenever a report tab mounts without focus polling or automatic retries. */
export const reportQueryPolicy = { retry: false, staleTime: 30_000, refetchOnMount: "always" as const, refetchOnWindowFocus: false };

export const reportCategoryLabels: Record<ReportCategory, string> = {
  payments: "Payment Reports",
  refunds: "Refund Reports",
  currencies: "Currency Reports",
  tax: "Tax Reports",
  settlements: "Merchant Settlement Reports",
  "exchange-rates": "Exchange Rate Reports",
  reconciliation: "Reconciliation Reports",
  "finance-audit": "Finance Audit History",
};

export type ReportCategoryDefinition = {
  description: string;
  columns: readonly string[];
};

/** Describes the backend fields expected for each report without inventing report rows. */
export const reportCategoryDefinitions: Record<ReportCategory, ReportCategoryDefinition> = {
  payments: {
    description: "Payment volume and status reporting will remain separated by currency.",
    columns: ["Date", "Payment status", "Gateway", "Transaction count", "Amount / currency"],
  },
  refunds: {
    description: "Refund activity and processing outcomes will be supplied by the Refunds API.",
    columns: ["Date", "Refund status", "Enterprise", "Refund count", "Amount / currency"],
  },
  currencies: {
    description: "Currency reporting requires an authoritative reporting currency and conversion basis.",
    columns: ["Currency", "Selling amount", "Payment amount", "Reporting basis", "Record count"],
  },
  tax: {
    description: "Tax reporting will preserve jurisdiction, classification and currency context.",
    columns: ["Country / region", "Tax type", "Taxable amount", "Tax collected", "Currency"],
  },
  settlements: {
    description: "Settlement reporting will keep gross amounts, deductions and net payouts separate.",
    columns: ["Settlement date", "Enterprise", "Gross", "Deductions / fees", "Net payout / currency"],
  },
  "exchange-rates": {
    description: "Exchange-rate reports will show source and effective time without locally calculating rates.",
    columns: ["Currency pair", "Rate source", "Effective time", "Applied rate", "Override"],
  },
  reconciliation: {
    description: "Reconciliation reports compare authoritative internal and gateway records.",
    columns: ["Reference", "Mismatch type", "Internal amount", "Gateway amount", "Status"],
  },
  "finance-audit": {
    description: "Finance audit history is read-only and will preserve administrator and change metadata.",
    columns: ["Administrator", "Action", "Affected entity", "Previous value", "Updated value", "Timestamp"],
  },
};

export const reconciliationMismatchTypes = [
  "missing_internal",
  "missing_gateway",
  "amount_mismatch",
  "status_mismatch",
  "fee_mismatch",
  "currency_mismatch",
  "duplicate",
] as const;

export type ReconciliationMismatchType = (typeof reconciliationMismatchTypes)[number];

export const reconciliationMismatchLabels: Record<ReconciliationMismatchType, string> = {
  missing_internal: "Missing internal record",
  missing_gateway: "Missing gateway record",
  amount_mismatch: "Amount mismatch",
  status_mismatch: "Status mismatch",
  fee_mismatch: "Fee mismatch",
  currency_mismatch: "Currency mismatch",
  duplicate: "Duplicate",
};

/** Returns a readable label while preserving an unknown backend mismatch type. */
export function getReconciliationMismatchLabel(type: string): string {
  return reconciliationMismatchLabels[type as ReconciliationMismatchType] ?? type;
}

/** No financial report rows or audit records are fabricated before API integration. */
export const reportPreviewRows: readonly never[] = [];

/** Values supported by the report screen; each endpoint receives only its declared subset. */
export type AppliedReportFilters = {
  date_from?: string;
  date_to?: string;
  tenant_id?: string;
  status?: string;
  currency?: string;
  quote?: string;
  group_by?: string;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_id?: string;
};

/** Builds a report request from only filters declared for the selected resource. */
export function buildReportParams(category: "payments", filters: AppliedReportFilters, page?: number, pageSize?: number): PaymentReportParams;
export function buildReportParams(category: "refunds", filters: AppliedReportFilters, page?: number, pageSize?: number): RefundReportParams;
export function buildReportParams(category: "settlements", filters: AppliedReportFilters, page?: number, pageSize?: number): SettlementReportParams;
export function buildReportParams(category: "currencies", filters: AppliedReportFilters): CurrencyReportParams;
export function buildReportParams(category: "exchange-rates", filters: AppliedReportFilters): ExchangeRateReportParams;
export function buildReportParams(category: "tax", filters: AppliedReportFilters): TaxReportParams;
export function buildReportParams(category: "reconciliation", filters: AppliedReportFilters): ReconciliationReportParams;
export function buildReportParams(category: "finance-audit", filters: AppliedReportFilters, page?: number, pageSize?: number): AuditListParams;
export function buildReportParams(category: ReportCategory, filters: AppliedReportFilters, page = 1, pageSize = 25): PaymentReportParams | RefundReportParams | SettlementReportParams | CurrencyReportParams | ExchangeRateReportParams | TaxReportParams | ReconciliationReportParams | AuditListParams {
  const params: Record<string, string | number> = {};
  const copy = (target: string, source: keyof AppliedReportFilters) => {
    const value = filters[source];
    if (value) params[target] = value;
  };
  if (["payments", "refunds", "settlements", "currencies", "tax", "reconciliation", "finance-audit", "exchange-rates"].includes(category)) {
    copy("date_from", "date_from");
    copy("date_to", "date_to");
  }
  if (["payments", "refunds", "settlements", "currencies", "tax", "finance-audit"].includes(category)) copy("tenant_id", "tenant_id");
  if (["payments", "refunds", "settlements"].includes(category)) copy("status", "status");
  if (category === "payments") copy("currency", "currency");
  if (category === "exchange-rates") copy("quote", "quote");
  if (category === "tax") copy("group_by", "group_by");
  if (category === "finance-audit") {
    copy("entity_type", "entity_type");
    copy("entity_id", "entity_id");
    copy("action", "action");
    copy("actor_id", "actor_id");
  }
  if (["payments", "refunds", "settlements", "finance-audit"].includes(category)) {
    params.page = page;
    params.page_size = pageSize;
  }
  return params as PaymentReportParams | RefundReportParams | SettlementReportParams | CurrencyReportParams | ExchangeRateReportParams | TaxReportParams | ReconciliationReportParams | AuditListParams;
}

const safeReportKey = /^(reference|payment_id|refund_id|settlement_id|invoice_id|tenant_id|date|date_from|date_to|timestamp|[a-z0-9_]*_at|period_start|period_end|action|entity_type|actor_role|group_by|resolved|[a-z0-9_]*(?:amount|total|base|collected|paid|pending|failed|refund|deduction|gross|net|count|rate|fee|tax|commission|currency|status|type|kind|provider|gateway|source|issue|matched|mismatched)[a-z0-9_]*)$/i;

/** Returns only non-sensitive scalar fields for generic backend report rows. */
export function getSafeReportFields(record: Readonly<Record<string, unknown>>): readonly (readonly [string, string])[] {
  return Object.entries(record)
    .filter(([key, value]) => safeReportKey.test(key) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null))
    .map(([key, value]) => [key, value === null ? "—" : String(value)] as const);
}

/** Converts a backend field name to a readable table label without changing its value. */
export function reportFieldLabel(field: string): string {
  return field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

/** Maps HTTP failures to safe, user-facing report error categories. */
export function reportErrorKey(status?: number): "sessionExpired" | "accessDenied" | "notFound" | "invalidRequest" | "unavailable" {
  if (status === 401) return "sessionExpired";
  if (status === 403) return "accessDenied";
  if (status === 404) return "notFound";
  if (status === 422) return "invalidRequest";
  return "unavailable";
}
