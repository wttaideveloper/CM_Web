import type {
  CommerceRecord,
  CurrencyReportParams,
  PaymentReportParams,
  RefundReportParams,
  SettlementReportParams,
  TaxReportParams,
  TaxReportGroupBy,
} from "@ihp/commerce";

export const ENTERPRISE_FINANCE_REPORT_PAGE_SIZE = 25;

/** Report categories supported by the merchant Finance reports page. */
export type EnterpriseFinanceReportCategory = "payments" | "refunds" | "settlements" | "currency" | "tax";

/** Only filters supported by the selected merchant report; tenant identity is context-derived. */
export type EnterpriseFinanceReportFilters = {
  date_from?: string;
  date_to?: string;
  status?: string;
  currency?: string;
  group_by?: TaxReportGroupBy;
};

/** Validated view of a typed shared Commerce report response. */
export type EnterpriseFinanceReportData = {
  base_currency?: string;
  rows: readonly CommerceRecord[];
  totals?: CommerceRecord;
  total_rows?: number;
  page?: number;
  page_size?: number;
  total_tax_base?: string;
  group_by?: string;
};

/** Builds endpoint-specific report filters and never accepts a client tenant selector or CSV mode. */
export function buildEnterpriseFinanceReportParams(category: "payments", filters: EnterpriseFinanceReportFilters, page: number): Omit<PaymentReportParams, "tenant_id" | "format">;
export function buildEnterpriseFinanceReportParams(category: "refunds", filters: EnterpriseFinanceReportFilters, page: number): Omit<RefundReportParams, "tenant_id" | "format">;
export function buildEnterpriseFinanceReportParams(category: "settlements", filters: EnterpriseFinanceReportFilters, page: number): Omit<SettlementReportParams, "tenant_id" | "format">;
export function buildEnterpriseFinanceReportParams(category: "currency", filters: EnterpriseFinanceReportFilters): Omit<CurrencyReportParams, "tenant_id" | "format">;
export function buildEnterpriseFinanceReportParams(category: "tax", filters: EnterpriseFinanceReportFilters): Omit<TaxReportParams, "tenant_id" | "format">;
export function buildEnterpriseFinanceReportParams(category: EnterpriseFinanceReportCategory, filters: EnterpriseFinanceReportFilters, page?: number): PaymentReportParams | RefundReportParams | SettlementReportParams | CurrencyReportParams | TaxReportParams;
export function buildEnterpriseFinanceReportParams(category: EnterpriseFinanceReportCategory, filters: EnterpriseFinanceReportFilters, page = 1): PaymentReportParams | RefundReportParams | SettlementReportParams | CurrencyReportParams | TaxReportParams {
  const dateParams = { date_from: filters.date_from || undefined, date_to: filters.date_to || undefined };
  if (category === "payments") return { ...dateParams, status: filters.status || undefined, currency: filters.currency || undefined, page, page_size: ENTERPRISE_FINANCE_REPORT_PAGE_SIZE };
  if (category === "refunds" || category === "settlements") return { ...dateParams, status: filters.status || undefined, page, page_size: ENTERPRISE_FINANCE_REPORT_PAGE_SIZE };
  if (category === "tax") return { ...dateParams, group_by: filters.group_by };
  return dateParams;
}

/** Validates the report envelope at runtime and keeps all backend decimal strings unchanged. */
export function parseEnterpriseFinanceReport(category: EnterpriseFinanceReportCategory, value: unknown): EnterpriseFinanceReportData {
  if (!isRecord(value) || !Array.isArray(value.rows) || !value.rows.every(isRecord)) throw new Error("The Finance report returned an invalid response.");
  const rows = value.rows as CommerceRecord[];
  if (category === "payments" || category === "refunds") {
    if (typeof value.base_currency !== "string" || !isNonNegativeInteger(value.total_rows) || !isPositiveInteger(value.page) || !isPositiveInteger(value.page_size) || !isRecord(value.totals)) throw new Error("The Finance report returned an invalid paginated response.");
    return { base_currency: value.base_currency, rows, total_rows: value.total_rows, page: value.page, page_size: value.page_size, totals: value.totals as CommerceRecord };
  }
  if (category === "settlements") {
    if (!isNonNegativeInteger(value.total_rows) || !isPositiveInteger(value.page) || !isPositiveInteger(value.page_size) || !isRecord(value.totals)) throw new Error("The Finance report returned an invalid paginated response.");
    return { rows, total_rows: value.total_rows, page: value.page, page_size: value.page_size, totals: value.totals as CommerceRecord };
  }
  if (category === "currency") {
    if (typeof value.base_currency !== "string" || !isRecord(value.totals)) throw new Error("The Currency report returned an invalid response.");
    return { base_currency: value.base_currency, rows, totals: value.totals as CommerceRecord };
  }
  if (typeof value.base_currency !== "string" || typeof value.total_tax_base !== "string" || typeof value.group_by !== "string") throw new Error("The Tax report returned an invalid response.");
  return { base_currency: value.base_currency, rows, total_tax_base: value.total_tax_base, group_by: value.group_by };
}

/** Validates any tenant identifiers returned in report envelopes, rows or totals. */
export function parseEnterpriseFinanceReportForTenant(category: EnterpriseFinanceReportCategory, value: unknown, authenticatedTenantId: string): EnterpriseFinanceReportData {
  if (!authenticatedTenantId) throw new Error("Authenticated tenant is unavailable.");
  if (isRecord(value) && Object.hasOwn(value, "tenant_id") && value.tenant_id !== authenticatedTenantId) {
    throw new Error("The report response did not match the authenticated tenant scope.");
  }
  const report = parseEnterpriseFinanceReport(category, value);
  const scopedRecords = [...report.rows, ...(report.totals ? [report.totals] : [])];
  for (const record of scopedRecords) {
    if (Object.hasOwn(record, "tenant_id") && record.tenant_id !== authenticatedTenantId) {
      throw new Error("The report response did not match the authenticated tenant scope.");
    }
  }
  return report;
}

/** Prevents private or unrecognized row fields from being rendered in generic report tables. */
export function getEnterpriseReportFields(category: EnterpriseFinanceReportCategory, record: CommerceRecord): readonly (readonly [string, string])[] {
  const allowed = category === "payments"
    ? /^(reference|payment_id|date|date_from|date_to|created_at|paid_at|currency|base_currency|status|payment_status|gateway|provider|purchase_type|amount|payment_amount|base_amount|base_collected|collected_amount|total_collected|paid|failed|waiting|pending|succeeded|processing|paid_count|failed_count|waiting_count|pending_count|processing_count|successful_count|payment_count|total_payments|total|total_count|count|gross_amount|fee_amount|tax_amount|net_amount)$/i
    : category === "refunds"
      ? /^(refund_id|payment_id|date|date_from|date_to|created_at|completed_at|currency|base_currency|status|refund_status|refund_type|amount|refund_amount|tax_refunded|completed|pending|open|failed|overdue|completed_count|pending_count|open_count|failed_count|overdue_count|escalation_count|escalated_count|escalated|count|total|total_refunds|total_amount)$/i
      : category === "settlements"
        ? /^(settlement_id|reference|date|date_from|date_to|created_at|period_start|period_end|paid_at|currency|base_currency|status|settlement_status|gross_amount|refund_amount|commission_amount|fee_amount|fixed_fee_amount|net_amount|pending|processing|completed|failed|cancelled|total|total_count|count)$/i
        : category === "currency"
          ? /^(currency|base_currency|payment_currency|selling_currency|payment_count|record_count|count|amount|selling_amount|payment_amount|base_amount|base_collected|total_amount)$/i
          : /^(tax_type|country|state|jurisdiction|group_by|name|currency|base_currency|count|rate|taxable_amount|tax_amount|tax_amount_charge|tax_collected|total_tax|total_tax_base|payment_id|date|created_at)$/i;
  return Object.entries(record)
    .filter(([key, item]) => allowed.test(key) && (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null))
    .map(([key, item]) => [key, item === null ? "—" : String(item)] as const);
}

/** Creates cache keys isolated by account, authenticated tenant, enterprise and report parameters. */
export function enterpriseFinanceReportQueryKey(accountId: string, tenantId: string, enterpriseId: string, category: EnterpriseFinanceReportCategory, params: object) {
  return ["enterprise-commerce", accountId, tenantId, enterpriseId, "reports", category, params] as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
