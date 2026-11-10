"use client";

import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { defaultReportCategory, reportCategories, type AppliedReportFilters, type ReportCategory } from "./platform-reports";
import { PlatformReportPanel } from "./PlatformReportPanels";

const emptyFilters: AppliedReportFilters = {};
const titleKeys: Record<ReportCategory, string> = {
  payments: "paymentsTab", refunds: "refundsTab", currencies: "currenciesTab", tax: "taxTab",
  settlements: "settlementsTab", "exchange-rates": "exchangeRatesTab", reconciliation: "reconciliationTab", "finance-audit": "auditTab",
};

/** Presents read-only backend financial reports, mounting queries only for the active tab. */
export default function PlatformReportsLiveScreen() {
  const { t } = useTranslation("platform");
  const [category, setCategory] = useState<ReportCategory>(defaultReportCategory);
  const [draft, setDraft] = useState<AppliedReportFilters>(emptyFilters);
  const [applied, setApplied] = useState<AppliedReportFilters>(emptyFilters);
  const update = (key: keyof AppliedReportFilters, value: string) => setDraft((current) => ({ ...current, [key]: value || undefined }));
  const filterKeys = category === "payments" ? ["date_from", "date_to", "tenant_id", "status", "currency"]
    : ["refunds", "settlements"].includes(category) ? ["date_from", "date_to", "tenant_id", "status"]
      : category === "currencies" ? ["date_from", "date_to", "tenant_id"]
        : category === "exchange-rates" ? ["date_from", "date_to", "quote"]
          : category === "tax" ? ["date_from", "date_to", "tenant_id", "group_by"]
            : category === "finance-audit" ? ["date_from", "date_to", "tenant_id", "entity_type", "entity_id", "action", "actor_id"]
              : ["date_from", "date_to"];
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = reportCategories.indexOf(category);
    const next = event.key === "Home" ? 0 : event.key === "End" ? reportCategories.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + reportCategories.length) % reportCategories.length;
    const nextCategory = reportCategories[next]!;
    setCategory(nextCategory);
    requestAnimationFrame(() => document.getElementById(`report-tab-${nextCategory}`)?.focus());
  };
  const reset = () => { setDraft(emptyFilters); setApplied(emptyFilters); };

  return <div className="space-y-5" aria-labelledby="reports-page-title">
    <h2 id="reports-page-title" className="sr-only">{t("commerceReports.pageTitle")}</h2>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="report-filters-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="report-filters-title" className="text-base font-bold text-[#06201c]">{t("commerceReports.filtersTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceReports.filtersDescription")}</p></div><div className="flex gap-2"><button type="button" onClick={() => setApplied({ ...draft })} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">{t("commerceReports.apply")}</button><button type="button" onClick={reset} disabled={!Object.values(draft).some(Boolean) && !Object.values(applied).some(Boolean)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:opacity-45">{t("commerceReports.reset")}</button></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{filterKeys.map((key) => <label key={key} className="text-sm font-semibold text-[#31594d]">{t(`commerceReports.filter.${key}`)}{key === "date_from" || key === "date_to" ? <input type="date" value={draft[key as keyof AppliedReportFilters] ?? ""} onChange={(event) => update(key as keyof AppliedReportFilters, event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /> : key === "group_by" ? <select value={draft.group_by ?? ""} onChange={(event) => update("group_by", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="">{t("commerceReports.all")}</option>{["tax_type", "country", "state", "name", "month", "day"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select> : <input type="search" value={draft[key as keyof AppliedReportFilters] ?? ""} onChange={(event) => update(key as keyof AppliedReportFilters, event.target.value)} placeholder={t("commerceReports.filterPlaceholder", { label: t(`commerceReports.filter.${key}`).toLowerCase() })} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" />}</label>)}</div>
    </section>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm" aria-labelledby="report-category-title"><h2 id="report-category-title" className="sr-only">{t("commerceReports.categories")}</h2><div role="tablist" aria-label={t("commerceReports.categories")} className="flex gap-2 overflow-x-auto">{reportCategories.map((item) => <button key={item} id={`report-tab-${item}`} type="button" role="tab" aria-selected={category === item} aria-controls={`report-panel-${item}`} tabIndex={category === item ? 0 : -1} onClick={() => setCategory(item)} onKeyDown={handleTabKeyDown} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold ${category === item ? "bg-[#1f6a58] text-white" : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f4faf7]"}`}>{t(`commerceReports.${titleKeys[item]}`)}</button>)}</div></section>
    <div id={`report-panel-${category}`} role="tabpanel" aria-labelledby={`report-tab-${category}`} tabIndex={0}><PlatformReportPanel key={`${category}-${JSON.stringify(applied)}`} category={category} filters={applied} /></div>
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="report-export-title"><h2 id="report-export-title" className="text-lg font-bold text-[#06201c]">{t("commerceReports.exportsTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceReports.exportsUnavailable")}</p><div className="mt-4 flex gap-2"><button type="button" disabled title={t("commerceReports.exportDisabledReason")} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:opacity-50">{t("commerceReports.exportCsv")}</button><button type="button" disabled title={t("commerceReports.exportDisabledReason")} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:opacity-50">{t("commerceReports.exportJson")}</button></div></section>
  </div>;
}
