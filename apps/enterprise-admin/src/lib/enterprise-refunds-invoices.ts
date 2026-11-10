import type { InvoiceListParams, InvoiceResponse, InvoiceTemplateResponse, RefundListParams, RefundResponse } from "@ihp/commerce";

export const ENTERPRISE_FINANCE_PAGE_SIZE = 25;

export type EnterpriseRefundFilters = {
  status: string;
  paymentId: string;
  dateFrom: string;
  dateTo: string;
  overdue: string;
};

export type EnterpriseInvoiceFilters = {
  documentType: "" | "invoice" | "credit_note" | "debit_note";
  paymentId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

/** Builds documented Refund filters without a browser-controlled tenant identifier. */
export function buildEnterpriseRefundParams(filters: EnterpriseRefundFilters, page: number): RefundListParams {
  return {
    page,
    page_size: ENTERPRISE_FINANCE_PAGE_SIZE,
    status: filters.status || undefined,
    payment_id: filters.paymentId.trim() || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    overdue: filters.overdue ? filters.overdue === "true" : undefined,
  };
}

/** Builds documented Invoice filters without a browser-controlled tenant identifier. */
export function buildEnterpriseInvoiceParams(filters: EnterpriseInvoiceFilters, page: number): InvoiceListParams {
  return {
    page,
    page_size: ENTERPRISE_FINANCE_PAGE_SIZE,
    doc_type: filters.documentType || undefined,
    payment_id: filters.paymentId.trim() || undefined,
    search: filters.search.trim() || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
  };
}

/** Creates per-account, per-tenant and per-enterprise cache keys for Enterprise financial records. */
export function enterpriseRefundsInvoicesQueryKeys(accountId: string, tenantId: string, enterpriseId: string) {
  const root = ["enterprise-commerce", accountId, tenantId, enterpriseId] as const;
  return {
    refunds: (params: RefundListParams) => [...root, "refunds", "list", params] as const,
    refund: (refundId: string) => [...root, "refunds", "detail", refundId] as const,
    invoices: (params: InvoiceListParams) => [...root, "invoices", "list", params] as const,
    invoice: (invoiceId: string) => [...root, "invoices", "detail", invoiceId] as const,
    invoiceTemplates: [...root, "invoices", "templates"] as const,
  };
}

function assertRecordTenant<T extends { tenant_id?: string | null }>(record: T, authenticatedTenantId: string, kind: string): T {
  if (record.tenant_id !== undefined && record.tenant_id !== authenticatedTenantId) {
    throw new Error(`The ${kind} response did not match the authenticated tenant scope.`);
  }
  return record;
}

function assertListTenant<T extends { items: readonly { tenant_id?: string | null }[] }>(response: T, authenticatedTenantId: string, kind: string): T {
  response.items.forEach((record) => assertRecordTenant(record, authenticatedTenantId, kind));
  return response;
}

export const assertEnterpriseRefundTenant = <T extends RefundResponse>(refund: T, tenantId: string): T => assertRecordTenant(refund, tenantId, "refund");
export const assertEnterpriseRefundListTenant = <T extends { items: readonly RefundResponse[] }>(response: T, tenantId: string): T => assertListTenant(response, tenantId, "refund");
export const assertEnterpriseInvoiceTenant = <T extends InvoiceResponse>(invoice: T, tenantId: string): T => assertRecordTenant(invoice, tenantId, "invoice");
export const assertEnterpriseInvoiceListTenant = <T extends { items: readonly InvoiceResponse[] }>(response: T, tenantId: string): T => assertListTenant(response, tenantId, "invoice");

/** Platform-default templates use a null tenant; tenant-specific templates must match the session tenant. */
export function assertEnterpriseInvoiceTemplateTenant<T extends InvoiceTemplateResponse>(template: T, tenantId: string): T {
  if (template.tenant_id !== undefined && template.tenant_id !== null && template.tenant_id !== tenantId) {
    throw new Error("The invoice template response did not match the authenticated tenant scope.");
  }
  return template;
}

export function hasEnterpriseFinanceScope(accountId: string | null, tenantId: string | null, enterpriseId: string | null): boolean {
  return Boolean(accountId && tenantId && enterpriseId);
}

/** Validates paginated list envelopes and falls back only to the requested page metadata. */
export function normalizeEnterpriseFinancePage<T>(value: unknown, requestedPage: number, requestedPageSize: number): { items: readonly T[]; total: number; page: number; page_size: number } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("The Finance service returned an invalid list response.");
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items) || typeof response.total !== "number" || !Number.isFinite(response.total) || response.total < 0) {
    throw new Error("The Finance service returned an invalid list response.");
  }
  const page = isPositiveInteger(response.page) ? response.page : requestedPage;
  const pageSize = isPositiveInteger(response.page_size) ? response.page_size : requestedPageSize;
  return { items: response.items as T[], total: response.total, page, page_size: pageSize };
}

/** Returns a finite display-page count, preserving a page for valid empty results. */
export function enterpriseFinancePageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(pageSize) || pageSize < 1) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Keeps decimal amounts exact and labels them only with their backend-supplied currency. */
export function enterpriseFinanceAmount(amount: string | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "Not supplied";
  return currency ? `${amount} ${currency}` : amount;
}

/** Formats a backend date for display while preserving unparseable source text. */
export function enterpriseFinanceDate(value: string | null | undefined): string {
  if (!value) return "Not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** Uses a supplied backend status label or preserves unknown backend statuses readably. */
export function enterpriseRefundStatusLabel(refund: RefundResponse): string {
  return refund.status_label?.trim() || refund.status.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Maps HTTP errors to distinct localized UI states without treating failures as empty results. */
export function enterpriseFinanceErrorKey(error: unknown): "unauthorized" | "forbidden" | "notFound" | "loadError" {
  if (!(error instanceof Error) || !("status" in error) || typeof error.status !== "number") return "loadError";
  if (error.status === 401) return "unauthorized";
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "notFound";
  return "loadError";
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
