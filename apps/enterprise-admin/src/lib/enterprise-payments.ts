import type { PaymentListParams, PaymentListResponse, PaymentResponse } from "@ihp/commerce";
import type { CommerceJsonValue } from "@ihp/commerce";

export const ENTERPRISE_PAYMENT_PAGE_SIZE = 25;

/** Known backend Payment status codes; unknown response values remain displayable. */
export const ENTERPRISE_PAYMENT_STATUSES = [
  "created", "requires_action", "processing", "authorized", "succeeded",
  "partially_refunded", "refunded", "failed", "cancelled", "expired", "review",
] as const;

/** Filters supported by the deployed Enterprise Payments collection endpoint. */
export type EnterprisePaymentFilters = {
  status: string;
  currency: string;
  purchaseType: string;
  dateFrom: string;
  dateTo: string;
};

/** Builds only supported list filters and intentionally omits tenant_id for server-derived scoping. */
export function buildEnterprisePaymentParams(
  filters: EnterprisePaymentFilters,
  page: number,
): PaymentListParams {
  return {
    page,
    page_size: ENTERPRISE_PAYMENT_PAGE_SIZE,
    status: filters.status || undefined,
    currency: filters.currency.trim().toUpperCase() || undefined,
    purchase_type: filters.purchaseType || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
  };
}

/** Creates account-, tenant- and enterprise-scoped cache keys for every payment query. */
export function enterprisePaymentQueryKeys(accountId: string, tenantId: string, enterpriseId: string) {
  const root = ["enterprise-commerce", accountId, tenantId, enterpriseId, "payments"] as const;
  return {
    list: (params: PaymentListParams) => [...root, "list", params] as const,
    detail: (paymentId: string) => [...root, "detail", paymentId] as const,
    history: (paymentId: string) => [...root, "gateway-history", paymentId] as const,
  };
}

/** Financial records may omit tenant_id for older contracts, but a supplied value must match session scope. */
export function assertEnterprisePaymentTenant<T extends { tenant_id?: string | null }>(payment: T, authenticatedTenantId: string): T {
  if (payment.tenant_id !== undefined && payment.tenant_id !== authenticatedTenantId) {
    throw new Error("The payment response did not match the authenticated tenant scope.");
  }
  return payment;
}

/** Rejects the entire page on a mismatched record rather than silently hiding it. */
export function assertEnterprisePaymentListTenant<T extends { items: readonly { tenant_id?: string | null }[] }>(response: T, authenticatedTenantId: string): T {
  response.items.forEach((payment) => assertEnterprisePaymentTenant(payment, authenticatedTenantId));
  return response;
}

export function hasEnterprisePaymentScope(accountId: string | null, tenantId: string | null, enterpriseId: string | null): boolean {
  return Boolean(accountId && tenantId && enterpriseId);
}

/** Returns the supplied human-readable status, or a known label without losing unknown statuses. */
export function enterprisePaymentStatusLabel(status: string, suppliedLabel?: string | null): string {
  if (suppliedLabel?.trim()) return suppliedLabel.trim();
  const labels: Record<string, string> = {
    created: "Created",
    requires_action: "Requires action",
    processing: "Processing",
    authorized: "Authorized",
    succeeded: "Succeeded",
    partially_refunded: "Partially refunded",
    refunded: "Refunded",
    failed: "Failed",
    cancelled: "Cancelled",
    expired: "Expired",
    review: "Under review",
  };
  return labels[status] ?? status.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Formats a backend timestamp for display while leaving invalid or absent values explicit. */
export function formatEnterprisePaymentDate(value: string | null | undefined): string {
  if (!value) return "Not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** Returns the total number of pages without treating a valid zero total as missing. */
export function enterprisePaymentPageCount(total: number, pageSize = ENTERPRISE_PAYMENT_PAGE_SIZE): number {
  if (!Number.isFinite(total) || !Number.isFinite(pageSize) || pageSize < 1) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/** Validates the payment collection envelope and applies requested pagination only when omitted. */
export function normalizeEnterprisePaymentList(
  value: unknown,
  requestedPage: number,
  requestedPageSize = ENTERPRISE_PAYMENT_PAGE_SIZE,
): PaymentListResponse {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The Payments service returned an invalid list response.");
  }
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items) || typeof response.total !== "number" || !Number.isFinite(response.total) || response.total < 0) {
    throw new Error("The Payments service returned an invalid list response.");
  }
  const page = typeof response.page === "number" && Number.isInteger(response.page) && response.page > 0 ? response.page : requestedPage;
  const pageSize = typeof response.page_size === "number" && Number.isInteger(response.page_size) && response.page_size > 0 ? response.page_size : requestedPageSize;
  return { items: response.items as PaymentResponse[], total: response.total, page, page_size: pageSize };
}

/** Keeps a backend decimal string exact and pairs it with its backend currency code. */
export function formatEnterprisePaymentAmount(amount: string | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "Not supplied";
  return currency ? `${amount} ${currency}` : amount;
}

/** Returns only key/value data from the backend transaction history and redacts credential-like fields. */
export function redactGatewayHistory(value: CommerceJsonValue): CommerceJsonValue {
  if (Array.isArray(value)) return value.map((item) => redactGatewayHistory(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      /token|secret|authorization|password|cvv|cvc|card_number|pan/i.test(key)
        ? "[redacted]"
        : redactGatewayHistory(entry),
    ]));
  }
  return value;
}

/** Returns the human-visible customer identifier only when the backend supplied it. */
export function enterprisePaymentCustomer(payment: PaymentResponse): string {
  return payment.customer_email?.trim() || payment.customer_user_id?.trim() || "Not supplied";
}
