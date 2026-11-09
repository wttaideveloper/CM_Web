"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CommerceApiError,
  getCommerceAuditHistory,
  getCurrencyReport,
  getExchangeRateReport,
  getPaymentReport,
  getReconciliationReport,
  getReconciliationRun,
  getReconciliationRuns,
  getRefundReport,
  getSettlementReport,
  getTaxReport,
  isCommerceUuid,
  type AuditEntryResponse,
  type CommerceRecord,
} from "@ihp/commerce";

import { platformCommerceRequest } from "@/lib/platform-commerce-client";
import { buildReportParams, getSafeReportFields, reportEndpointPaths, reportErrorKey, reportFieldLabel, reportQueryPolicy, type AppliedReportFilters, type ReportCategory } from "./platform-reports";

const PAGE_SIZE = 25;
const card = "rounded-2xl border border-[#e1ebe6] bg-white shadow-sm";

/** Loads only the currently selected report category from the authenticated read-only BFF. */
export function PlatformReportPanel({ category, filters }: { category: ReportCategory; filters: AppliedReportFilters }) {
  switch (category) {
    case "payments": return <PaymentReport filters={filters} />;
    case "refunds": return <RefundReport filters={filters} />;
    case "settlements": return <SettlementReport filters={filters} />;
    case "currencies": return <CurrencyReport filters={filters} />;
    case "exchange-rates": return <ExchangeRateReport filters={filters} />;
    case "tax": return <TaxReport filters={filters} />;
    case "reconciliation": return <ReconciliationPanel filters={filters} />;
    case "finance-audit": return <AuditReport filters={filters} />;
  }
}

function PaymentReport({ filters }: { filters: AppliedReportFilters }) {
  const [page, setPage] = useState(1);
  const params = buildReportParams("payments", filters, page, PAGE_SIZE);
  const query = useQuery({ queryKey: ["platform-commerce", "report", reportEndpointPaths.payments[0], params], queryFn: () => getPaymentReport(params, platformCommerceRequest), ...reportQueryPolicy });
  return <PagedReport titleKey="paymentsTitle" query={query} rows={query.data?.rows} totals={query.data?.totals} currency={query.data?.base_currency} total={query.data?.total_rows} page={page} pageSize={query.data?.page_size ?? PAGE_SIZE} onPage={setPage} />;
}

function RefundReport({ filters }: { filters: AppliedReportFilters }) {
  const [page, setPage] = useState(1);
  const params = buildReportParams("refunds", filters, page, PAGE_SIZE);
  const query = useQuery({ queryKey: ["platform-commerce", "report", reportEndpointPaths.refunds[0], params], queryFn: () => getRefundReport(params, platformCommerceRequest), ...reportQueryPolicy });
  return <PagedReport titleKey="refundsTitle" query={query} rows={query.data?.rows} totals={query.data?.totals} currency={query.data?.base_currency} total={query.data?.total_rows} page={page} pageSize={query.data?.page_size ?? PAGE_SIZE} onPage={setPage} />;
}

function SettlementReport({ filters }: { filters: AppliedReportFilters }) {
  const [page, setPage] = useState(1);
  const params = buildReportParams("settlements", filters, page, PAGE_SIZE);
  const query = useQuery({ queryKey: ["platform-commerce", "report", reportEndpointPaths.settlements[0], params], queryFn: () => getSettlementReport(params, platformCommerceRequest), ...reportQueryPolicy });
  return <PagedReport titleKey="settlementsTitle" query={query} rows={query.data?.rows} totals={query.data?.totals} total={query.data?.total_rows} page={page} pageSize={query.data?.page_size ?? PAGE_SIZE} onPage={setPage} />;
}

function CurrencyReport({ filters }: { filters: AppliedReportFilters }) {
  const params = buildReportParams("currencies", filters);
  const query = useQuery({ queryKey: ["platform-commerce", "report", reportEndpointPaths.currencies[0], params], queryFn: () => getCurrencyReport(params, platformCommerceRequest), ...reportQueryPolicy });
  return <ReportQuerySection titleKey="currenciesTitle" query={query} rows={query.data?.rows} totals={query.data?.totals} currency={query.data?.base_currency} />;
}

function ExchangeRateReport({ filters }: { filters: AppliedReportFilters }) {
  const params = buildReportParams("exchange-rates", filters);
  const query = useQuery({ queryKey: ["platform-commerce", "report", reportEndpointPaths["exchange-rates"][0], params], queryFn: () => getExchangeRateReport(params, platformCommerceRequest), ...reportQueryPolicy });
  return <ReportQuerySection titleKey="exchangeRatesTitle" query={query} rows={query.data?.rows} totals={query.data ? { total_rows: query.data.total_rows } : undefined} currency={query.data?.base_currency} secondaryRows={query.data?.summary} secondaryTitle="exchangeRateSummary" />;
}

function TaxReport({ filters }: { filters: AppliedReportFilters }) {
  const params = buildReportParams("tax", filters);
  const query = useQuery({ queryKey: ["platform-commerce", "report", reportEndpointPaths.tax[0], params], queryFn: () => getTaxReport(params, platformCommerceRequest), ...reportQueryPolicy });
  return <ReportQuerySection titleKey="taxTitle" query={query} rows={query.data?.rows} totals={query.data ? { total_tax_base: query.data.total_tax_base } : undefined} currency={query.data?.base_currency} />;
}

function ReconciliationPanel({ filters }: { filters: AppliedReportFilters }) {
  const params = buildReportParams("reconciliation", filters);
  const query = useQuery({ queryKey: ["platform-commerce", "report", reportEndpointPaths.reconciliation[0], params], queryFn: () => getReconciliationReport(params, platformCommerceRequest), ...reportQueryPolicy });
  return <div className="space-y-4"><ReportQuerySection titleKey="reconciliationSummaryTitle" query={query} rows={query.data?.rows} totals={query.data?.totals} secondaryRows={query.data?.by_issue} secondaryTitle="reconciliationByIssue" /><ReconciliationRunsPanel /></div>;
}

function ReconciliationRunsPanel() {
  const { t } = useTranslation("platform");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = { page, page_size: PAGE_SIZE };
  const query = useQuery({ queryKey: ["platform-commerce", reportEndpointPaths.reconciliation[1], params], queryFn: () => getReconciliationRuns(params, platformCommerceRequest), ...reportQueryPolicy });
  const details = useQuery({ queryKey: ["platform-commerce", reportEndpointPaths.reconciliation[2], selectedId], queryFn: () => getReconciliationRun(selectedId!, {}, platformCommerceRequest), enabled: Boolean(selectedId && isCommerceUuid(selectedId)), ...reportQueryPolicy });
  return <section className={`${card} p-5`} aria-labelledby="reconciliation-runs-title"><h3 id="reconciliation-runs-title" className="text-lg font-bold text-[#06201c]">{t("commerceReports.reconciliationRunsTitle")}</h3><p className="mt-1 text-sm text-[#52736a]">{t("commerceReports.reconciliationRunsDescription")}</p><QueryFeedback query={query} label={t("commerceReports.reconciliationRunsTitle")} />
    {query.data ? <><RecordTable rows={query.data.items as unknown as readonly CommerceRecord[]} empty={t("commerceReports.noRuns")} />{query.data.total > PAGE_SIZE ? <Pager page={page} pageSize={PAGE_SIZE} total={query.data.total} onPage={setPage} disabled={query.isFetching} /> : null}</> : null}
    {query.data?.items.map((run) => <button key={run.id} type="button" disabled={!isCommerceUuid(run.id)} onClick={() => setSelectedId(run.id)} className="mr-2 mt-3 rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#1f6a58] disabled:opacity-50">{t("commerceReports.viewRun", { id: run.id })}</button>)}
    {selectedId ? <section className="mt-4 rounded-xl border border-[#edf3f0] p-4" aria-labelledby="reconciliation-run-detail-title"><div className="flex justify-between gap-2"><h4 id="reconciliation-run-detail-title" className="font-bold">{t("commerceReports.runDetails")}</h4><button type="button" onClick={() => setSelectedId(null)} className="text-sm underline">{t("commerceReports.close")}</button></div><QueryFeedback query={details} label={t("commerceReports.runDetails")} />{details.data ? <><RecordTable rows={[details.data as unknown as CommerceRecord]} empty={t("commerceReports.noRunDetails")} /><RecordTable rows={details.data.items ?? []} empty={t("commerceReports.noRunItems")} /></> : null}</section> : null}
  </section>;
}

function AuditReport({ filters }: { filters: AppliedReportFilters }) {
  const [page, setPage] = useState(1);
  const params = buildReportParams("finance-audit", filters, page, PAGE_SIZE);
  const query = useQuery({ queryKey: ["platform-commerce", reportEndpointPaths["finance-audit"][0], params], queryFn: () => getCommerceAuditHistory(params, platformCommerceRequest), ...reportQueryPolicy });
  return <AuditQuerySection query={query} page={page} pageSize={query.data?.page_size ?? PAGE_SIZE} onPage={setPage} />;
}

function AuditQuerySection({ query, page, pageSize, onPage }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getCommerceAuditHistory>>>>; page: number; pageSize: number; onPage: (page: number) => void }) {
  const { t } = useTranslation("platform");
  const records = query.data?.items.map(safeAuditRecord) ?? [];
  return <section className={`${card} p-5`} aria-labelledby="finance-audit-title"><h2 id="finance-audit-title" className="text-lg font-bold text-[#06201c]">{t("commerceReports.auditTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceReports.auditDescription")}</p><QueryFeedback query={query} label={t("commerceReports.auditTitle")} />{query.data ? <><RecordTable rows={records} empty={t("commerceReports.noAudit")} /><Pager page={query.data.page || page} pageSize={query.data.page_size || pageSize} total={query.data.total} onPage={onPage} disabled={query.isFetching} /></> : null}</section>;
}

function safeAuditRecord(entry: AuditEntryResponse): CommerceRecord {
  const record: Record<string, string | number | boolean | null> = { action: entry.action, entity_type: entry.entity_type, actor_role: entry.actor_role ?? null, created_at: entry.created_at };
  for (const [key, value] of Object.entries(entry.before ?? {})) if (/^(status|payment_status|refund_status|settlement_status)$/i.test(key) && ["string", "number", "boolean"].includes(typeof value)) record[`before_${key}`] = value as string | number | boolean;
  for (const [key, value] of Object.entries(entry.after ?? {})) if (/^(status|payment_status|refund_status|settlement_status)$/i.test(key) && ["string", "number", "boolean"].includes(typeof value)) record[`after_${key}`] = value as string | number | boolean;
  return record;
}

function PagedReport({ titleKey, query, rows, totals, currency, total, page, pageSize, onPage }: { titleKey: string; query: ReportQuery; rows?: readonly CommerceRecord[]; totals?: CommerceRecord; currency?: string; total?: number; page: number; pageSize: number; onPage: (page: number) => void }) {
  const { t } = useTranslation("platform");
  return <section className={`${card} p-5`} aria-labelledby={`report-${titleKey}`}><h2 id={`report-${titleKey}`} className="text-lg font-bold text-[#06201c]">{t(`commerceReports.${titleKey}`)}</h2><QueryFeedback query={query} label={t(`commerceReports.${titleKey}`)} />{rows ? <><TotalsRecord totals={totals} currency={currency} /><RecordTable rows={rows} empty={t("commerceReports.emptyRows")} /><Pager page={page} pageSize={pageSize} total={total ?? rows.length} onPage={onPage} disabled={query.isFetching} /></> : null}</section>;
}

function ReportQuerySection({ titleKey, query, rows, totals, currency, secondaryRows, secondaryTitle }: { titleKey: string; query: ReportQuery; rows?: readonly CommerceRecord[]; totals?: CommerceRecord; currency?: string; secondaryRows?: readonly CommerceRecord[]; secondaryTitle?: string }) {
  const { t } = useTranslation("platform");
  return <section className={`${card} p-5`} aria-labelledby={`report-${titleKey}`}><h2 id={`report-${titleKey}`} className="text-lg font-bold text-[#06201c]">{t(`commerceReports.${titleKey}`)}</h2><QueryFeedback query={query} label={t(`commerceReports.${titleKey}`)} />{rows ? <><TotalsRecord totals={totals} currency={currency} /><RecordTable rows={rows} empty={t("commerceReports.emptyRows")} />{secondaryRows ? <div className="mt-5"><h3 className="mb-2 font-semibold text-[#06201c]">{t(`commerceReports.${secondaryTitle}`)}</h3><RecordTable rows={secondaryRows} empty={t("commerceReports.emptyRows")} /></div> : null}</> : null}</section>;
}

function TotalsRecord({ totals, currency }: { totals?: CommerceRecord; currency?: string }) {
  const { t } = useTranslation("platform");
  const fields = totals ? getSafeReportFields(totals) : [];
  return <>{currency ? <p className="my-3 text-sm text-[#52736a]">{t("commerceReports.accountingCurrency", { currency })}</p> : null}{fields.length ? <dl className="my-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{fields.map(([key, value]) => <div key={key} className="rounded-lg border border-[#edf3f0] p-3"><dt className="text-xs font-semibold text-[#52736a]">{reportFieldLabel(key)}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#06201c]">{value}</dd></div>)}</dl> : null}</>;
}

function RecordTable({ rows, empty }: { rows: readonly CommerceRecord[]; empty: string }) {
  const { t } = useTranslation("platform");
  const fields = [...new Set(rows.flatMap((row) => getSafeReportFields(row).map(([key]) => key)))];
  if (!rows.length) return <p className="rounded-xl bg-[#f9fcfa] p-5 text-sm text-[#52736a]">{empty}</p>;
  if (!fields.length) return <p className="rounded-xl bg-[#f9fcfa] p-5 text-sm text-[#52736a]">{t("commerceReports.noDisplayableFields")}</p>;
  return <div className="overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-full text-left text-sm"><caption className="sr-only">{t("commerceReports.recordsCaption")}</caption><thead className="bg-[#f9fcfa] text-xs font-semibold text-[#52736a]"><tr>{fields.map((field) => <th key={field} scope="col" className="px-4 py-3">{reportFieldLabel(field)}</th>)}</tr></thead><tbody>{rows.map((row, index) => { const values = new Map(getSafeReportFields(row)); return <tr key={String(row.id ?? index)} className="border-t border-[#edf3f0]">{fields.map((field) => <td key={field} className="max-w-xs break-words px-4 py-3">{values.get(field) ?? "—"}</td>)}</tr>; })}</tbody></table></div>;
}

function Pager({ page, pageSize, total, onPage, disabled }: { page: number; pageSize: number; total: number; onPage: (page: number) => void; disabled: boolean }) {
  const { t } = useTranslation("platform");
  const pages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
  return <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#52736a]"><span>{t("commerceReports.pageLabel", { page, pages, total })}</span><div className="flex gap-2"><button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1 || disabled} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:opacity-45">{t("commerceReports.previous")}</button><button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages || disabled} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:opacity-45">{t("commerceReports.next")}</button></div></div>;
}

type ReportQuery = { isPending: boolean; isError: boolean; isFetching: boolean; error: Error | null; refetch: () => Promise<unknown> };

function QueryFeedback({ query, label }: { query: ReportQuery; label: string }) {
  const { t } = useTranslation("platform");
  if (query.isPending) return <p className="my-4 text-sm text-[#52736a]" role="status">{t("commerceReports.loading", { label })}</p>;
  if (!query.isError) return query.isFetching ? <p className="my-2 text-xs text-[#52736a]" role="status">{t("commerceReports.refreshing")}</p> : null;
  const status = query.error instanceof CommerceApiError ? query.error.status : undefined;
  const errorText = t(`commerceReports.${reportErrorKey(status)}`);
  return <div className="my-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm font-semibold text-[#b42318]">{t("commerceReports.loadError", { label })}</p><p className="mt-1 text-sm text-[#7f2922]">{errorText}</p><button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} className="mt-3 rounded-full border border-[#e7b8b2] px-3 py-1.5 text-sm font-semibold text-[#b42318] disabled:opacity-50">{t("commerceReports.retry")}</button></div>;
}
