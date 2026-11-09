import type { PaymentListParams, PaymentResponse } from "@ihp/commerce";

export const transactionStatuses = [
  "created",
  "requires_action",
  "processing",
  "authorized",
  "succeeded",
  "partially_refunded",
  "refunded",
  "failed",
  "cancelled",
  "expired",
  "review",
] as const;

export type KnownTransactionStatus = (typeof transactionStatuses)[number];
/** A backend status remains displayable even when it is newer than this UI. */
export type TransactionStatus = string;

export type TransactionFilterValues = {
  search: string;
  enterprise: string;
  module: string;
  currency: string;
  status: TransactionStatus | "all";
  from: string;
  to: string;
};

/** Maps dashboard-friendly payment labels to the documented transaction statuses. */
export function resolveTransactionStatus(value: string | null | undefined): TransactionStatus | "all" {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "all";

  const aliases: Record<string, string> = {
    successful: "succeeded",
    success: "succeeded",
    pending: "processing",
  };

  return aliases[normalized] ?? normalized;
}

/** Reads transaction filters from route search parameters without creating financial data. */
export function transactionFiltersFromQuery(query: { get: (key: string) => string | null }): TransactionFilterValues {
  return {
    search: query.get("search") ?? "",
    enterprise: query.get("enterprise") ?? "",
    module: query.get("module") ?? "",
    currency: query.get("currency") ?? "",
    status: resolveTransactionStatus(query.get("status") ?? query.get("payment_status")),
    from: query.get("from") ?? "",
    to: query.get("to") ?? "",
  };
}

export const transactionStatusLabels: Record<KnownTransactionStatus, string> = {
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

export const transactionActionNames = [
  "view_details",
  "capture",
  "cancel",
  "resolve_review",
  "refund",
  "download_invoice",
  "view_gateway_transactions",
] as const;

export type TransactionActionName = string;

export const transactionActionLabels: Record<string, string> = {
  view_details: "View details",
  capture: "Capture",
  cancel: "Cancel",
  resolve_review: "Resolve review",
  refund: "Refund",
  download_invoice: "Download invoice",
  view_gateway_transactions: "View gateway transactions",
};

/** Legacy preview shape retained only for the previous helper test contract. */
export type TransactionPreview = {
  id: string;
  customer: string;
  enterprise: string;
  module: "Products" | "Services" | "Events" | "Trainings";
  originalAmount: string;
  originalCurrency: string;
  paymentAmount: string;
  paymentCurrency: string;
  status: TransactionStatus;
  date: string;
  offering: string;
  discount: string;
  taxBreakdown: string;
  exchangeRate: string;
  gateway: string;
  gatewayReference: string;
  paymentAttempt: string;
  statusHistory: string;
  invoiceReference: string;
  refundReference: string;
  reconciliationStatus: string;
  actions: readonly TransactionActionName[];
};

/** Empty compatibility export; real Transactions data comes from the Payments API. */
export const transactionPreviews: readonly TransactionPreview[] = [];

/** Legacy empty-list helper retained for existing focused tests. */
export function filterTransactions(transactions: readonly TransactionPreview[], _filters?: unknown): readonly TransactionPreview[] {
  void _filters;
  return transactions;
}

/** Maps a backend status code to a readable label while preserving unknown values. */
export function getTransactionStatusLabel(status: string): string {
  const knownLabel = transactionStatusLabels[status as KnownTransactionStatus];
  if (knownLabel) return knownLabel;
  return humanizeCode(status);
}

/** Maps a backend action code to a readable label without enabling the action. */
export function getTransactionActionLabel(action: string): string {
  return transactionActionLabels[action] ?? humanizeCode(action);
}

/** Builds only the documented server-side payment filters. */
export function buildPaymentListParams(filters: TransactionFilterValues, page: number, pageSize: number): PaymentListParams {
  return {
    status: filters.status === "all" ? undefined : filters.status,
    currency: filters.currency.trim().toUpperCase() || undefined,
    tenant_id: filters.enterprise.trim() || undefined,
    date_from: filters.from || undefined,
    date_to: filters.to || undefined,
    page,
    page_size: pageSize,
  };
}

/** Returns a backend-supplied customer reference without inventing a display name. */
export function getPaymentCustomerReference(payment: PaymentResponse): string {
  return payment.customer_email?.trim() || payment.customer_user_id?.trim() || "Not supplied";
}

/** Returns the backend-supplied enterprise/tenant reference. */
export function getPaymentEnterpriseReference(payment: PaymentResponse): string {
  return payment.tenant_id?.trim() || "Not supplied";
}

/** Returns the backend purchase type exactly as supplied. */
export function getPaymentModule(payment: PaymentResponse): string {
  return payment.purchase_type?.trim() || "Not supplied";
}

/** Returns the backend status label, falling back to the status code. */
export function getPaymentStatusLabel(payment: PaymentResponse): string {
  return payment.status_label?.trim() || getTransactionStatusLabel(payment.status);
}

function humanizeCode(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
