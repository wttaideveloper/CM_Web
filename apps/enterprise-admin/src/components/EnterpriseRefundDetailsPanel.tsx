"use client";

import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, getRefund, type RefundResponse } from "@ihp/commerce";
import { useTranslation } from "react-i18next";

import { assertEnterpriseRefundTenant, enterpriseFinanceAmount, enterpriseFinanceDate, enterpriseRefundStatusLabel, enterpriseRefundsInvoicesQueryKeys } from "@/lib/enterprise-refunds-invoices";
import { FinanceRecordError } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;

/** Displays authoritative refund details within the account/enterprise-scoped query cache. */
export default function EnterpriseRefundDetailsPanel({ accountId, tenantId, enterpriseId, refundId, onClose }: { accountId: string; tenantId: string; enterpriseId: string; refundId: string; onClose: () => void }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const query = useQuery({
    queryKey: enterpriseRefundsInvoicesQueryKeys(accountId, tenantId, enterpriseId).refund(refundId),
    queryFn: async () => assertEnterpriseRefundTenant(await getRefund(refundId, REQUEST_OPTIONS), tenantId),
    staleTime: 15_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  return <aside className="space-y-4 rounded-2xl border border-[#d7e5df] bg-white p-4 shadow-sm sm:p-6" aria-labelledby="enterprise-refund-details-heading">
    <header className="flex items-start justify-between gap-3"><div><h2 id="enterprise-refund-details-heading" className="text-lg font-bold text-[#06201c]">{t("details")}</h2><p className="mt-1 break-all font-mono text-xs text-[#52736a]">{refundId}</p></div><button type="button" onClick={onClose} className="rounded-lg border border-[#d7e5df] px-3 py-2 text-sm font-semibold">{t("closeDetails")}</button></header>
    {query.isPending ? <p role="status" className="text-sm text-[#52736a]">{t("loading")}</p> : null}
    {query.isError ? <FinanceRecordError error={query.error} onRetry={() => void query.refetch()} /> : null}
    {query.data ? <RefundFields refund={query.data} /> : null}
  </aside>;
}

function RefundFields({ refund }: { refund: RefundResponse }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const fields: readonly [string, string][] = [
    [t("status"), enterpriseRefundStatusLabel(refund)],
    [t("paymentId"), refund.payment_id],
    [t("refundType"), refund.refund_type],
    [t("amount"), enterpriseFinanceAmount(refund.amount, refund.currency)],
    [t("reason"), refund.reason ?? t("noValue")],
    [t("destination"), refund.destination],
    [t("taxRefunded"), enterpriseFinanceAmount(refund.tax_refunded, refund.currency)],
    [t("decisionReason"), refund.decision_reason ?? t("noValue")],
    [t("created"), enterpriseFinanceDate(refund.created_at)],
    [t("decidedAt"), enterpriseFinanceDate(refund.decided_at)],
    [t("approvedAt"), enterpriseFinanceDate(refund.approved_at)],
    [t("completedAt"), enterpriseFinanceDate(refund.completed_at)],
    [t("bankReference"), refund.bank_reference ?? t("noValue")],
    [t("failureReason"), refund.failure_reason ?? t("noValue")],
  ];
  return <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold text-[#52736a]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#06201c]">{value}</dd></div>)}</dl>;
}
