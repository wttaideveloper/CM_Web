"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CommerceApiError, getCurrencyReport, getPaymentReport, getRefundReport, getSettlementReport, getTaxReport,
  type CommerceRecord, type TaxReportGroupBy,
} from "@ihp/commerce";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import {
  buildEnterpriseFinanceReportParams,
  enterpriseFinanceReportQueryKey, getEnterpriseReportFields, parseEnterpriseFinanceReportForTenant,
  type EnterpriseFinanceReportCategory, type EnterpriseFinanceReportData, type EnterpriseFinanceReportFilters,
} from "@/lib/enterprise-finance-reports";
import { FinanceRecordError, FinanceRecordPager } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;
const EMPTY_FILTERS: EnterpriseFinanceReportFilters = {};
const REPORT_TABS: readonly { id: EnterpriseFinanceReportCategory; labelKey: string }[] = [
  { id: "payments", labelKey: "paymentReports" }, { id: "refunds", labelKey: "refundReports" },
  { id: "settlements", labelKey: "settlementReports" }, { id: "currency", labelKey: "currencyReports" },
  { id: "tax", labelKey: "taxReports" },
];
const TAX_GROUPS: readonly TaxReportGroupBy[] = ["tax_type", "country", "state", "name", "month", "day"];

/** Displays merchant-scoped, read-only financial reports from the Enterprise Commerce BFF. */
export default function EnterpriseFinanceReportsScreen({ accountId, tenantId, enterpriseId, enterpriseName }: { accountId: string; tenantId: string; enterpriseId: string; enterpriseName: string }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const [category, setCategory] = useState<EnterpriseFinanceReportCategory>("payments");
  const [draft, setDraft] = useState<EnterpriseFinanceReportFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<EnterpriseFinanceReportFilters>(EMPTY_FILTERS);
  const selectedIndex = REPORT_TABS.findIndex((tab) => tab.id === category);
  const apply = () => setApplied({ ...draft });
  const reset = () => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? REPORT_TABS.length - 1 : (selectedIndex + (event.key === "ArrowRight" ? 1 : -1) + REPORT_TABS.length) % REPORT_TABS.length;
    const nextId = REPORT_TABS[next]!.id;
    setCategory(nextId);
    requestAnimationFrame(() => document.getElementById(`enterprise-report-tab-${nextId}`)?.focus());
  };

  return <main className="min-w-0 space-y-5 bg-white p-4 sm:p-6 lg:p-8" aria-labelledby="enterprise-finance-reports-title">
    <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7f9d94]">{t("reportsTitle")}</p><h1 id="enterprise-finance-reports-title" className="mt-1 text-2xl font-extrabold text-[#06201c]">{t("reportsTitle")}</h1><p className="mt-2 max-w-3xl text-sm text-[#52736a]">{t("reportsDescription", { enterprise: enterpriseName })}</p></header>
    <section aria-labelledby="enterprise-report-filters-title" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="enterprise-report-filters-title" className="text-base font-bold text-[#06201c]">{t("reportFilters")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("reportFiltersHint")}</p></div><div className="flex gap-2"><button type="button" onClick={apply} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">{t("apply")}</button><button type="button" onClick={reset} disabled={!Object.values(draft).some(Boolean) && !Object.values(applied).some(Boolean)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#31594d] disabled:opacity-50">{t("reset")}</button></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-[#31594d]">{t("dateFrom")}<input type="date" value={draft.date_from ?? ""} onChange={(event) => setDraft((current) => ({ ...current, date_from: event.target.value || undefined }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("dateTo")}<input type="date" value={draft.date_to ?? ""} onChange={(event) => setDraft((current) => ({ ...current, date_to: event.target.value || undefined }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal" /></label>
        {["payments", "refunds", "settlements"].includes(category) ? <label className="text-sm font-semibold text-[#31594d]">{t("status")}<input value={draft.status ?? ""} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value || undefined }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal" /></label> : null}
        {category === "payments" ? <label className="text-sm font-semibold text-[#31594d]">{t("currency")}<input value={draft.currency ?? ""} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value || undefined }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal" /></label> : null}
        {category === "tax" ? <label className="text-sm font-semibold text-[#31594d]">{t("groupBy")}<select value={draft.group_by ?? ""} onChange={(event) => setDraft((current) => ({ ...current, group_by: (event.target.value || undefined) as TaxReportGroupBy | undefined }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal"><option value="">{t("allGroups")}</option>{TAX_GROUPS.map((group) => <option key={group} value={group}>{group.replaceAll("_", " ")}</option>)}</select></label> : null}
      </div>
    </section>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm" aria-labelledby="enterprise-report-tabs-heading"><h2 id="enterprise-report-tabs-heading" className="sr-only">{t("reportCategories")}</h2><div role="tablist" aria-label={t("reportCategories")} className="flex gap-2 overflow-x-auto">{REPORT_TABS.map((tab) => <button key={tab.id} id={`enterprise-report-tab-${tab.id}`} type="button" role="tab" aria-selected={category === tab.id} aria-controls={`enterprise-report-panel-${tab.id}`} tabIndex={category === tab.id ? 0 : -1} onClick={() => setCategory(tab.id)} onKeyDown={onTabKeyDown} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold ${category === tab.id ? "bg-[#1f6a58] text-white" : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f4faf7]"}`}>{t(tab.labelKey)}</button>)}</div></section>
    <div id={`enterprise-report-panel-${category}`} role="tabpanel" aria-labelledby={`enterprise-report-tab-${category}`} tabIndex={0}><EnterpriseFinanceReportPanel key={`${category}-${JSON.stringify(applied)}`} accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} category={category} filters={applied} /></div>
    <p className="text-xs text-[#7f9d94]">{t("reportReadOnlyNotice")}</p>
  </main>;
}

function EnterpriseFinanceReportPanel({ accountId, tenantId, enterpriseId, category, filters }: { accountId: string; tenantId: string; enterpriseId: string; category: EnterpriseFinanceReportCategory; filters: EnterpriseFinanceReportFilters }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const [page, setPage] = useState(1);
  const params = buildParams(category, filters, page);
  const query = useQuery({
    queryKey: enterpriseFinanceReportQueryKey(accountId, tenantId, enterpriseId, category, params),
    queryFn: async () => parseEnterpriseFinanceReportForTenant(category, await fetchReport(category, filters, page), tenantId),
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  return <section aria-labelledby="enterprise-report-data-title" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
    <h2 id="enterprise-report-data-title" className="text-lg font-bold text-[#06201c]">{t(REPORT_TABS.find((tab) => tab.id === category)?.labelKey ?? "reportsTitle")}</h2>
    {query.isPending ? <p role="status" className="my-4 text-sm text-[#52736a]">{t("loading")}</p> : null}
    {query.isError ? <FinanceRecordError error={query.error} onRetry={() => void query.refetch()} /> : null}
    {query.data ? <ReportData category={category} data={query.data} page={page} onPage={setPage} busy={query.isFetching} /> : null}
  </section>;
}

function buildParams(category: EnterpriseFinanceReportCategory, filters: EnterpriseFinanceReportFilters, page: number) {
  if (category === "payments" || category === "refunds" || category === "settlements") return buildEnterpriseFinanceReportParams(category, filters, page);
  return buildEnterpriseFinanceReportParams(category, filters);
}

async function fetchReport(category: EnterpriseFinanceReportCategory, filters: EnterpriseFinanceReportFilters, page: number): Promise<unknown> {
  if (category === "payments") return getPaymentReport(buildEnterpriseFinanceReportParams("payments", filters, page), REQUEST_OPTIONS);
  if (category === "refunds") return getRefundReport(buildEnterpriseFinanceReportParams("refunds", filters, page), REQUEST_OPTIONS);
  if (category === "settlements") return getSettlementReport(buildEnterpriseFinanceReportParams("settlements", filters, page), REQUEST_OPTIONS);
  if (category === "currency") return getCurrencyReport(buildEnterpriseFinanceReportParams("currency", filters), REQUEST_OPTIONS);
  return getTaxReport(buildEnterpriseFinanceReportParams("tax", filters), REQUEST_OPTIONS);
}

function ReportData({ category, data, page, onPage, busy }: { category: EnterpriseFinanceReportCategory; data: EnterpriseFinanceReportData; page: number; onPage: (page: number) => void; busy: boolean }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const totals = data.totals ? getEnterpriseReportFields(category, data.totals) : [];
  return <>
    {data.base_currency ? <p className="mt-3 text-sm text-[#52736a]">{t("accountingCurrency")}: {data.base_currency}</p> : null}
    {category === "tax" ? <p className="mt-3 text-sm font-semibold text-[#31594d]">{t("taxCollectedBase", { amount: data.total_tax_base ?? t("noValue"), currency: data.base_currency ?? t("noValue") })}</p> : null}
    {totals.length ? <dl className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{totals.map(([key, value]) => <div key={key} className="rounded-xl border border-[#edf3f0] p-3"><dt className="text-xs font-semibold text-[#52736a]">{reportLabel(key)}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#06201c]">{value}</dd></div>)}</dl> : null}
    <ReportRows category={category} rows={data.rows} />
    {data.total_rows !== undefined && data.page !== undefined && data.page_size !== undefined ? <FinanceRecordPager page={data.page || page} pageCount={Math.max(1, Math.ceil(data.total_rows / Math.max(1, data.page_size)))} total={data.total_rows} busy={busy} onPage={onPage} /> : null}
  </>;
}

function ReportRows({ category, rows }: { category: EnterpriseFinanceReportCategory; rows: readonly CommerceRecord[] }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  if (rows.length === 0) return <p className="mt-4 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-5 text-center text-sm text-[#52736a]">{t("reportNoRows")}</p>;
  const fields = [...new Set(rows.flatMap((row) => getEnterpriseReportFields(category, row).map(([key]) => key)))];
  if (fields.length === 0) return <p className="mt-4 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-5 text-sm text-[#52736a]">{t("reportNoDisplayableFields")}</p>;
  return <div className="mt-4 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-full text-left text-sm"><caption className="sr-only">{t(REPORT_TABS.find((tab) => tab.id === category)?.labelKey ?? "reportsTitle")}</caption><thead className="bg-[#fbfdfc] text-xs text-[#52736a]"><tr>{fields.map((field) => <th key={field} scope="col" className="px-3 py-3">{reportLabel(field)}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3f0]">{rows.map((row, index) => { const values = new Map(getEnterpriseReportFields(category, row)); return <tr key={String(row.id ?? row.payment_id ?? row.refund_id ?? row.settlement_id ?? index)}>{fields.map((field) => <td key={field} className="max-w-xs break-words px-3 py-3">{values.get(field) ?? "—"}</td>)}</tr>; })}</tbody></table></div>;
}

function reportLabel(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}
