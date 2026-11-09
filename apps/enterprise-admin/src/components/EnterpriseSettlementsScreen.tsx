"use client";

import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, getSettlementConfig, listSettlements, type SettlementResponse } from "@ihp/commerce";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { enterpriseFinanceAmount, enterpriseFinanceDate, enterpriseFinancePageCount } from "@/lib/enterprise-refunds-invoices";
import { assertSettlementListTenant, buildEnterpriseSettlementParams, enterpriseSettlementQueryKeys, ENTERPRISE_SETTLEMENT_PAGE_SIZE, hasEnterpriseSettlementScope, normalizeEnterpriseSettlementPage, settlementConfigMatchesTenant, settlementListReference, settlementStatusLabel, type EnterpriseSettlementFilters } from "@/lib/enterprise-settlements";
import EnterpriseSettlementDetailsPanel from "./EnterpriseSettlementDetailsPanel";
import { FinanceRecordError, FinanceRecordPager } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;
const EMPTY_FILTERS: EnterpriseSettlementFilters = { status: "", dateFrom: "", dateTo: "" };

/** Read-only merchant-scoped settlement list, details and configuration. */
export default function EnterpriseSettlementsScreen({ accountId, tenantId, enterpriseId, enterpriseName }: { accountId: string | null; tenantId: string | null; enterpriseId: string; enterpriseName: string }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useMemo(() => buildEnterpriseSettlementParams(filters, page), [filters, page]);
  const keys = useMemo(() => accountId && tenantId ? enterpriseSettlementQueryKeys(accountId, tenantId, enterpriseId) : null, [accountId, enterpriseId, tenantId]);
  const listQuery = useQuery({
    queryKey: keys?.list(params) ?? ["enterprise-commerce", "unavailable-account", enterpriseId, "settlements", params],
    queryFn: async () => {
      if (!tenantId) throw new Error("Authenticated tenant is unavailable.");
      const result = normalizeEnterpriseSettlementPage(await listSettlements(params, REQUEST_OPTIONS), page);
      return assertSettlementListTenant(result, tenantId);
    },
    enabled: hasEnterpriseSettlementScope(accountId, tenantId, enterpriseId),
    staleTime: 15_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  const configQuery = useQuery({
    queryKey: keys?.config ?? ["enterprise-commerce", "unavailable-account", enterpriseId, "settlements", "config"],
    // Do not send tenant_id; configuration scope is derived from the authenticated merchant session.
    queryFn: () => getSettlementConfig({}, REQUEST_OPTIONS),
    enabled: hasEnterpriseSettlementScope(accountId, tenantId, enterpriseId),
    staleTime: 30_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setFilters({ ...draft }); setPage(1); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(1); };
  const data = listQuery.data;
  const pageCount = enterpriseFinancePageCount(data?.total ?? 0, data?.page_size ?? ENTERPRISE_SETTLEMENT_PAGE_SIZE);
  const scopedRows = data?.items ?? [];
  const scopedConfig = settlementConfigMatchesTenant(configQuery.data, tenantId) ? configQuery.data : null;

  return <main className="min-w-0 space-y-5 bg-white p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7f9d94]">{t("settlementsTitle")}</p><h1 className="mt-1 text-2xl font-extrabold text-[#06201c]">{t("settlementsTitle")}</h1><p className="mt-2 max-w-3xl text-sm text-[#52736a]">{t("settlementsDescription", { enterprise: enterpriseName })}</p></header>
    <form onSubmit={submit} aria-labelledby="enterprise-settlement-filters-heading" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
      <h2 id="enterprise-settlement-filters-heading" className="text-base font-bold text-[#06201c]">{t("settlementFilters")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold text-[#31594d]">{t("status")}<input value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("dateFrom")}<input type="date" value={draft.dateFrom} onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("dateTo")}<input type="date" value={draft.dateTo} onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">{t("apply")}</button><button type="button" onClick={reset} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#31594d]">{t("reset")}</button></div>
    </form>
    <section aria-labelledby="enterprise-settlement-list-heading" className="min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
      <h2 id="enterprise-settlement-list-heading" className="px-4 pt-4 text-base font-bold text-[#06201c]">{t("settlementList")}</h2>
      {!accountId || !tenantId ? <p role="alert" className="m-4 rounded-xl bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]">{t("tenantUnavailable")}</p> : null}
      {listQuery.isPending ? <p role="status" className="p-4 text-sm text-[#52736a]">{t("loading")}</p> : null}
      {listQuery.isError ? <div className="m-4"><FinanceRecordError error={listQuery.error} onRetry={() => void listQuery.refetch()} /></div> : null}
      {data ? <>
        {scopedRows.length === 0 ? <p className="m-4 rounded-xl border border-[#edf3f0] p-6 text-center text-sm text-[#52736a]">{t("noSettlements")}</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><caption className="sr-only">{t("settlementList")}</caption><thead className="border-y border-[#edf3f0] bg-[#fbfdfc] text-xs text-[#52736a]"><tr>{[t("settlementReference"), t("settlementPeriod"), t("grossAmount"), t("refundAdjustments"), t("commission"), t("gatewayFees"), t("netPayout"), t("currency"), t("status"), t("created"), t("actions")].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3f0]">{scopedRows.map((settlement) => <SettlementRow key={settlement.id} settlement={settlement} onSelect={() => setSelectedId(settlement.id)} />)}</tbody></table></div>}
        <FinanceRecordPager page={data.page} pageCount={pageCount} total={data.total} busy={listQuery.isFetching} onPage={setPage} />
      </> : null}
    </section>
    <section aria-labelledby="enterprise-settlement-config-heading" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
      <h2 id="enterprise-settlement-config-heading" className="text-base font-bold text-[#06201c]">{t("settlementConfiguration")}</h2>
      <p className="mt-1 text-sm text-[#52736a]">{t("settlementConfigScope")}</p>
      {configQuery.isPending ? <p role="status" className="mt-3 text-sm text-[#52736a]">{t("loading")}</p> : null}
      {configQuery.isError ? <div className="mt-3"><FinanceRecordError error={configQuery.error} onRetry={() => void configQuery.refetch()} /></div> : null}
      {configQuery.data && !scopedConfig ? <p role="alert" className="mt-3 text-sm text-[#8f3b2f]">{t("settlementConfigScopeMismatch")}</p> : null}
      {scopedConfig ? <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
        [t("schedule"), scopedConfig.schedule], [t("weekday"), scopedConfig.weekday], [t("monthDay"), scopedConfig.month_day], [t("currency"), scopedConfig.currency],
        [t("commission"), scopedConfig.effective_commission_percent ?? scopedConfig.commission_percent ?? t("noValue")], [t("fixedFees"), enterpriseFinanceAmount(scopedConfig.fixed_fee, scopedConfig.currency)],
        [t("minimumPayout"), enterpriseFinanceAmount(scopedConfig.min_payout, scopedConfig.currency)], [t("holdStatus"), scopedConfig.hold ? t("onHold") : t("notOnHold")],
        [t("payoutAccount"), scopedConfig.payout_account ? t("payoutAccountWithheld") : t("noValue")], [t("lastRun"), enterpriseFinanceDate(scopedConfig.last_run_at)], [t("updated"), enterpriseFinanceDate(scopedConfig.updated_at)],
      ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-[#52736a]">{label}</dt><dd className="mt-1 text-sm font-medium text-[#06201c]">{String(value)}</dd></div>)}</dl> : null}
      <p className="mt-4 text-xs text-[#52736a]">{t("settlementReadOnlyNotice")}</p>
    </section>
    {selectedId && accountId && tenantId ? <EnterpriseSettlementDetailsPanel accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} settlementId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    <p className="text-xs text-[#7f9d94]">{t("pageLoadingHint")}</p>
  </main>;
}

function SettlementRow({ settlement, onSelect }: { settlement: SettlementResponse; onSelect: () => void }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  return <tr className="align-top"><td className="max-w-48 break-all px-3 py-3 font-mono text-xs">{settlementListReference(settlement.reference, settlement.id)}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceDate(settlement.period_start)} – {enterpriseFinanceDate(settlement.period_end)}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceAmount(settlement.gross_amount, settlement.currency)}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceAmount(settlement.refund_amount, settlement.currency)}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceAmount(settlement.commission_amount, settlement.currency)}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceAmount(settlement.fee_amount, settlement.currency)}</td><td className="whitespace-nowrap px-3 py-3 font-semibold">{enterpriseFinanceAmount(settlement.net_amount, settlement.currency)}</td><td className="px-3 py-3">{settlement.currency}</td><td className="px-3 py-3">{settlementStatusLabel(settlement.status)}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceDate(settlement.created_at)}</td><td className="px-3 py-3"><button type="button" onClick={onSelect} className="whitespace-nowrap font-bold text-[#1f6a58] underline">{t("viewDetails")}</button></td></tr>;
}
