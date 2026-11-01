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

export type TransactionStatus = (typeof transactionStatuses)[number];

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
  const aliases: Record<string, TransactionStatus> = {
    successful: "succeeded",
    success: "succeeded",
    succeeded: "succeeded",
    pending: "processing",
    processing: "processing",
  };

  if (normalized && aliases[normalized]) {
    return aliases[normalized];
  }

  return transactionStatuses.includes(normalized as TransactionStatus)
    ? (normalized as TransactionStatus)
    : "all";
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

export const transactionStatusLabels: Record<TransactionStatus, string> = {
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

export type TransactionActionName = (typeof transactionActionNames)[number];

export const transactionActionLabels: Record<TransactionActionName, string> = {
  view_details: "View details",
  capture: "Capture",
  cancel: "Cancel",
  resolve_review: "Resolve review",
  refund: "Refund",
  download_invoice: "Download invoice",
  view_gateway_transactions: "View gateway transactions",
};

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

/** No transaction records are fabricated before the documented Payments API is connected. */
export const transactionPreviews: readonly TransactionPreview[] = [];

/** Maps backend status codes to stable human-readable labels without changing their meaning. */
export function getTransactionStatusLabel(status: TransactionStatus): string {
  return transactionStatusLabels[status];
}

/** Maps backend action codes to labels without granting an action locally. */
export function getTransactionActionLabel(action: TransactionActionName): string {
  return transactionActionLabels[action];
}

/** Filters only locally available transaction records; it performs no financial calculations. */
export function filterTransactions(
  transactions: readonly TransactionPreview[],
  filters: { search: string; enterprise: string; module: string; currency: string; status: TransactionStatus | "all"; from?: string; to?: string },
) {
  const search = filters.search.trim().toLowerCase();
  const enterprise = filters.enterprise.trim().toLowerCase();
  const currency = filters.currency.trim().toLowerCase();
  return transactions.filter((transaction) => {
    const matchesSearch = !search || `${transaction.id} ${transaction.customer}`.toLowerCase().includes(search);
    const matchesEnterprise = !enterprise || transaction.enterprise.toLowerCase().includes(enterprise);
    const matchesModule = !filters.module || transaction.module.toLowerCase() === filters.module.toLowerCase();
    const matchesCurrency = !currency || `${transaction.originalCurrency} ${transaction.paymentCurrency}`.toLowerCase().includes(currency);
    const matchesStatus = filters.status === "all" || transaction.status === filters.status;
    const transactionDate = transaction.date.slice(0, 10);
    const matchesFrom = !filters.from || transactionDate >= filters.from;
    const matchesTo = !filters.to || transactionDate <= filters.to;
    return matchesSearch && matchesEnterprise && matchesModule && matchesCurrency && matchesStatus && matchesFrom && matchesTo;
  });
}
