export const refundActionNames = [
  "full_refund",
  "partial_refund",
  "approve",
  "reject",
  "retry",
  "record_manual_completion",
] as const;

export type RefundActionName = (typeof refundActionNames)[number];

export const refundActionLabels: Record<RefundActionName, string> = {
  full_refund: "Full refund",
  partial_refund: "Partial refund",
  approve: "Approve",
  reject: "Reject",
  retry: "Retry failed refund",
  record_manual_completion: "Record manual completion",
};

export type RefundPreview = {
  id: string;
  paymentId: string;
  enterprise: string;
  customer: string;
  module: "Products" | "Services" | "Events" | "Trainings";
  refundAmount: string;
  refundCurrency: string;
  status: string;
  requestDate: string;
  originalPurchase: string;
  originalPaymentStatus: string;
  reason: string;
  refundType: string;
  previousRefunds: string;
  remainingRefundableAmount: string;
  cancellationPolicy: string;
  taxAdjustments: string;
  settlementAdjustments: string;
  gatewayReference: string;
  requestedAt: string;
  processedAt: string;
  actions: readonly RefundActionName[];
};

/** No refund records are fabricated before the documented refund APIs are connected. */
export const refundPreviews: readonly RefundPreview[] = [];

/** Maps backend-provided action codes to safe labels without enabling local mutations. */
export function getRefundActionLabel(action: RefundActionName): string {
  return refundActionLabels[action];
}

/** Filters only records already supplied by an authoritative refund response. */
export function filterRefunds(
  refunds: readonly RefundPreview[],
  filters: { search: string; enterprise: string; module: string; currency: string; status: string; from?: string; to?: string },
) {
  const search = filters.search.trim().toLowerCase();
  const enterprise = filters.enterprise.trim().toLowerCase();
  const currency = filters.currency.trim().toLowerCase();
  const status = filters.status.trim().toLowerCase();
  return refunds.filter((refund) => {
    const matchesSearch = !search || `${refund.id} ${refund.paymentId} ${refund.customer}`.toLowerCase().includes(search);
    const matchesEnterprise = !enterprise || refund.enterprise.toLowerCase().includes(enterprise);
    const matchesModule = !filters.module || refund.module.toLowerCase() === filters.module.toLowerCase();
    const matchesCurrency = !currency || refund.refundCurrency.toLowerCase().includes(currency);
    const matchesStatus = !status || refund.status.toLowerCase() === status;
    const refundDate = refund.requestDate.slice(0, 10);
    const matchesFrom = !filters.from || refundDate >= filters.from;
    const matchesTo = !filters.to || refundDate <= filters.to;
    return matchesSearch && matchesEnterprise && matchesModule && matchesCurrency && matchesStatus && matchesFrom && matchesTo;
  });
}
