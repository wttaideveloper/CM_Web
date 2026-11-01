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
