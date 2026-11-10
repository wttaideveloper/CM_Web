export const settlementStatusPreviewStates = ["pending", "processing", "completed", "failed", "cancelled"] as const;

export const settlementStatusLabels: Record<(typeof settlementStatusPreviewStates)[number], string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const settlementActionNames = [
  "run_settlements",
  "dry_run",
  "verify",
  "export_csv",
  "record_payout_reference",
  "mark_payout_failed",
  "cancel",
] as const;

export type SettlementActionName = (typeof settlementActionNames)[number];

export const settlementActionLabels: Record<SettlementActionName, string> = {
  run_settlements: "Generate settlement",
  dry_run: "Dry run",
  verify: "Verify settlement",
  export_csv: "Export CSV",
  record_payout_reference: "Record payout reference",
  mark_payout_failed: "Mark payout failed",
  cancel: "Cancel settlement",
};

export type SettlementPreview = {
  id: string;
  enterprise: string;
  grossAmount: string;
  refundDeductions: string;
  commission: string;
  gatewayFees: string;
  fixedFees: string;
  netPayoutAmount: string;
  currency: string;
  status: string;
  date: string;
  period: string;
  schedule: string;
  eligibleVerifiedPayments: string;
  completedRefunds: string;
  payoutAccountMasked: string;
  payoutReference: string;
  payoutTimestamp: string;
  verificationStatus: string;
  actions: readonly SettlementActionName[];
};

/** No settlement records are fabricated before the documented settlement APIs are connected. */
export const settlementPreviews: readonly SettlementPreview[] = [];

/** Returns a known label and preserves unknown backend statuses without rejecting them. */
export function getSettlementStatusLabel(status: string): string {
  const normalizedStatus = status.toLowerCase() as keyof typeof settlementStatusLabels;
  return settlementStatusLabels[normalizedStatus] ?? status;
}

/** Maps operation codes to labels without enabling a financial mutation locally. */
export function getSettlementActionLabel(action: SettlementActionName): string {
  return settlementActionLabels[action];
}

/** Filters only settlement records already supplied by an authoritative backend response. */
export function filterSettlements(
  settlements: readonly SettlementPreview[],
  filters: { search: string; enterprise: string; currency: string; status: string; from?: string; to?: string },
) {
  const search = filters.search.trim().toLowerCase();
  const enterprise = filters.enterprise.trim().toLowerCase();
  const currency = filters.currency.trim().toLowerCase();
  const status = filters.status.trim().toLowerCase();
  return settlements.filter((settlement) => {
    const matchesSearch = !search || `${settlement.id} ${settlement.enterprise}`.toLowerCase().includes(search);
    const matchesEnterprise = !enterprise || settlement.enterprise.toLowerCase().includes(enterprise);
    const matchesCurrency = !currency || settlement.currency.toLowerCase().includes(currency);
    const matchesStatus = !status || settlement.status.toLowerCase() === status;
    const settlementDate = settlement.date.slice(0, 10);
    const matchesFrom = !filters.from || settlementDate >= filters.from;
    const matchesTo = !filters.to || settlementDate <= filters.to;
    return matchesSearch && matchesEnterprise && matchesCurrency && matchesStatus && matchesFrom && matchesTo;
  });
}
