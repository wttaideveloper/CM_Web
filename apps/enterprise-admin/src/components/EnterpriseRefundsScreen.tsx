"use client";

import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, listRefunds, type RefundResponse } from "@ihp/commerce";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { assertEnterpriseRefundListTenant, buildEnterpriseRefundParams, enterpriseFinanceAmount, enterpriseFinanceDate, enterpriseFinancePageCount, enterpriseRefundStatusLabel, enterpriseRefundsInvoicesQueryKeys, hasEnterpriseFinanceScope, normalizeEnterpriseFinancePage, ENTERPRISE_FINANCE_PAGE_SIZE, type EnterpriseRefundFilters } from "@/lib/enterprise-refunds-invoices";
import EnterpriseRefundDetailsPanel from "./EnterpriseRefundDetailsPanel";
import { FinanceRecordError, FinanceRecordPager } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;
const EMPTY_FILTERS: EnterpriseRefundFilters = { status: "", paymentId: "", dateFrom: "", dateTo: "", overdue: "" };

/** Renders backend-paginated, read-only refunds for the authenticated enterprise. */
export default function EnterpriseRefundsScreen({ accountId, tenantId, enterpriseId, enterpriseName }: { accountId: string | null; tenantId: string | null; enterpriseId: string; enterpriseName: string }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useMemo(() => buildEnterpriseRefundParams(filters, page), [filters, page]);
  const queryKeys = useMemo(() => accountId && tenantId ? enterpriseRefundsInvoicesQueryKeys(accountId, tenantId, enterpriseId) : null, [accountId, tenantId, enterpriseId]);
  const query = useQuery({
    queryKey: queryKeys?.refunds(params) ?? ["enterprise-commerce", accountId ?? "unavailable-account", tenantId ?? "unresolved-tenant", enterpriseId, "refunds", params],
    queryFn: async () => {
      if (!tenantId) throw new Error("Authenticated tenant is unavailable.");
      const response = normalizeEnterpriseFinancePage<RefundResponse>(await listRefunds(params, REQUEST_OPTIONS), page, ENTERPRISE_FINANCE_PAGE_SIZE);
      return assertEnterpriseRefundListTenant(response, tenantId);
    },
    enabled: hasEnterpriseFinanceScope(accountId, tenantId, enterpriseId),
    staleTime: 15_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setFilters({ ...draft }); setPage(1); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(1); };
  const data = query.data;
  const pageCount = enterpriseFinancePageCount(data?.total ?? 0, data?.page_size ?? ENTERPRISE_FINANCE_PAGE_SIZE);

  return <main className="min-w-0 space-y-5 bg-white p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7f9d94]">{t("refundsTitle")}</p><h1 className="mt-1 text-2xl font-extrabold text-[#06201c]">{t("refundsTitle")}</h1><p className="mt-2 max-w-3xl text-sm text-[#52736a]">{t("refundsDescription", { enterprise: enterpriseName })}</p></header>
    <form onSubmit={submit} aria-labelledby="enterprise-refund-filters-heading" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
      <h2 id="enterprise-refund-filters-heading" className="text-base font-bold text-[#06201c]">{t("refundsFilters")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-semibold text-[#31594d]">{t("refundStatus")}<input value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("paymentId")}<input value={draft.paymentId} onChange={(event) => setDraft((current) => ({ ...current, paymentId: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("dateFrom")}<input type="date" value={draft.dateFrom} onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("dateTo")}<input type="date" value={draft.dateTo} onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("overdue")}<select value={draft.overdue} onChange={(event) => setDraft((current) => ({ ...current, overdue: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal"><option value="">{t("anyOverdue")}</option><option value="true">{t("overdueYes")}</option><option value="false">{t("overdueNo")}</option></select></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">{t("apply")}</button><button type="button" onClick={reset} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#31594d]">{t("reset")}</button></div>
    </form>
    <section aria-labelledby="enterprise-refund-list-heading" className="min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
      <h2 id="enterprise-refund-list-heading" className="px-4 pt-4 text-base font-bold text-[#06201c]">{t("refundsList")}</h2>
      {!accountId || !tenantId ? <p role="alert" className="m-4 rounded-xl bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]">{!accountId ? t("unauthorized") : t("tenantUnavailable")}</p> : null}
      {query.isPending ? <p role="status" className="p-4 text-sm text-[#52736a]">{t("loading")}</p> : null}
      {query.isError ? <div className="m-4"><FinanceRecordError error={query.error} onRetry={() => void query.refetch()} /></div> : null}
      {data ? <>
        {data.items.length === 0 ? <p className="m-4 rounded-xl border border-[#edf3f0] p-6 text-center text-sm text-[#52736a]">{t("noRefunds")}</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><caption className="sr-only">{t("refundsList")}</caption><thead className="border-y border-[#edf3f0] bg-[#fbfdfc] text-xs text-[#52736a]"><tr>{[t("refundId"), t("paymentId"), t("amount"), t("status"), t("reason"), t("created"), t("actions")].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3f0]">{data.items.map((refund) => <tr key={refund.id} className="align-top"><td className="max-w-52 break-all px-3 py-3 font-mono text-xs">{refund.id}</td><td className="max-w-52 break-all px-3 py-3 font-mono text-xs">{refund.payment_id}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceAmount(refund.amount, refund.currency)}</td><td className="px-3 py-3">{enterpriseRefundStatusLabel(refund)}</td><td className="max-w-56 px-3 py-3">{refund.reason || t("noValue")}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceDate(refund.created_at)}</td><td className="px-3 py-3"><button type="button" onClick={() => setSelectedId(refund.id)} className="whitespace-nowrap font-bold text-[#1f6a58] underline">{t("viewDetails")}</button></td></tr>)}</tbody></table></div>}
        <FinanceRecordPager page={data.page} pageCount={pageCount} total={data.total} busy={query.isFetching} onPage={setPage} />
      </> : null}
    </section>
    {selectedId && accountId && tenantId ? <EnterpriseRefundDetailsPanel accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} refundId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    <p className="text-xs text-[#7f9d94]">{t("pageLoadingHint")}</p>
  </main>;
}
