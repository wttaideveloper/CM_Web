"use client";

import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, getSettlement, type SettlementDetailResponse } from "@ihp/commerce";
import { useTranslation } from "react-i18next";

import { enterpriseFinanceAmount, enterpriseFinanceDate } from "@/lib/enterprise-refunds-invoices";
import { assertSettlementTenant, enterpriseSettlementQueryKeys, settlementStatusLabel } from "@/lib/enterprise-settlements";
import { FinanceRecordError } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;

export default function EnterpriseSettlementDetailsPanel({ accountId, tenantId, enterpriseId, settlementId, onClose }: { accountId: string; tenantId: string; enterpriseId: string; settlementId: string; onClose: () => void }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const query = useQuery({
    queryKey: enterpriseSettlementQueryKeys(accountId, tenantId, enterpriseId).detail(settlementId),
    queryFn: async () => assertSettlementTenant(await getSettlement(settlementId, REQUEST_OPTIONS), tenantId),
    staleTime: 15_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  return <aside aria-labelledby="enterprise-settlement-details-heading" className="space-y-4 rounded-2xl border border-[#d7e5df] bg-white p-4 shadow-sm sm:p-6">
    <header className="flex items-start justify-between gap-3"><div><h2 id="enterprise-settlement-details-heading" className="text-lg font-bold text-[#06201c]">{t("settlementDetails")}</h2><p className="mt-1 break-all font-mono text-xs text-[#52736a]">{settlementId}</p></div><button type="button" onClick={onClose} className="rounded-lg border border-[#d7e5df] px-3 py-2 text-sm font-semibold">{t("closeDetails")}</button></header>
    {query.isPending ? <p role="status" className="text-sm text-[#52736a]">{t("loading")}</p> : null}
    {query.isError ? <FinanceRecordError error={query.error} onRetry={() => void query.refetch()} /> : null}
    {query.data ? <SettlementDetailsFields settlement={query.data} /> : null}
  </aside>;
}

function SettlementDetailsFields({ settlement }: { settlement: SettlementDetailResponse }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const fields: readonly [string, string][] = [
    [t("settlementReference"), settlement.reference],
    [t("status"), settlementStatusLabel(settlement.status)],
    [t("settlementPeriod"), `${enterpriseFinanceDate(settlement.period_start)} – ${enterpriseFinanceDate(settlement.period_end)}`],
    [t("currency"), settlement.currency],
    [t("grossAmount"), enterpriseFinanceAmount(settlement.gross_amount, settlement.currency)],
    [t("refundAdjustments"), enterpriseFinanceAmount(settlement.refund_amount, settlement.currency)],
    [t("commission"), enterpriseFinanceAmount(settlement.commission_amount, settlement.currency)],
    [t("gatewayFees"), enterpriseFinanceAmount(settlement.fee_amount, settlement.currency)],
    [t("fixedFees"), enterpriseFinanceAmount(settlement.fixed_fee_amount, settlement.currency)],
    [t("netPayout"), enterpriseFinanceAmount(settlement.net_amount, settlement.currency)],
    [t("payoutReference"), settlement.payout_reference || t("noValue")],
    [t("paidAt"), enterpriseFinanceDate(settlement.paid_at)],
    [t("created"), enterpriseFinanceDate(settlement.created_at)],
    [t("failureReason"), settlement.failure_reason || t("noValue")],
    [t("settlementItemsCount"), String(settlement.items_count)],
  ];
  return <div className="space-y-5">
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold text-[#52736a]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#06201c]">{value}</dd></div>)}</dl>
    {settlement.items?.length ? <section aria-labelledby="settlement-line-items-heading"><h3 id="settlement-line-items-heading" className="mb-2 text-sm font-bold text-[#06201c]">{t("settlementItems")}</h3><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead><tr>{[t("kind"), t("paymentId"), t("refundId"), t("chargeAmount"), t("grossAmount"), t("commission"), t("gatewayFees"), t("netPayout")].map((label) => <th key={label} scope="col" className="border-b p-2">{label}</th>)}</tr></thead><tbody className="divide-y">{settlement.items.map((item) => <tr key={item.id}><td className="p-2">{item.kind}</td><td className="break-all p-2 font-mono">{item.payment_id || t("noValue")}</td><td className="break-all p-2 font-mono">{item.refund_id || t("noValue")}</td><td className="whitespace-nowrap p-2">{enterpriseFinanceAmount(item.charge_amount, item.charge_currency)}</td><td className="whitespace-nowrap p-2">{item.gross}</td><td className="whitespace-nowrap p-2">{item.commission}</td><td className="whitespace-nowrap p-2">{item.fee}</td><td className="whitespace-nowrap p-2">{item.net}</td></tr>)}</tbody></table></div></section> : null}
    <p className="text-xs text-[#52736a]">{t("verificationExportUnavailable")}</p>
  </div>;
}
