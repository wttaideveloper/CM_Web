"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CommerceApiError, getSettlement, getSettlementConfig, listSettlements, type SettlementConfigResponse, type SettlementDetailResponse, type SettlementResponse } from "@ihp/commerce";
import { platformCommerceRequest } from "@/lib/platform-commerce-client";

import { buildSettlementListParams, getPayoutAccountDisplay, getSettlementAmountFields, getSettlementPagination, isSettlementTenantId, settlementConfigMatchesTenant, settlementErrorKey, type SettlementFilters } from "./platform-settlements-live";
import { getSettlementStatusLabel } from "./platform-settlements";

const PAGE_SIZE = 25;
const initialFilters: SettlementFilters = { tenantId: "", status: "", from: "", to: "" };
const card = "rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm";

/** Renders backend settlement data through the authenticated, GET-only Super Admin Commerce BFF. */
export default function PlatformSettlementsLiveScreen() {
  const { t } = useTranslation("platform");
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useMemo(() => buildSettlementListParams(appliedFilters, page, PAGE_SIZE), [appliedFilters, page]);
  const listQuery = useQuery({
    queryKey: ["platform-commerce", "settlements", params],
    queryFn: () => listSettlements(params, platformCommerceRequest),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
  const updateFilter = <K extends keyof SettlementFilters>(key: K, value: SettlementFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return <div className="space-y-5" aria-labelledby="settlements-page-title">
    <h2 id="settlements-page-title" className="sr-only">{t("commerceSettlements.pageTitle")}</h2>
    <section className={card} aria-labelledby="settlements-filters-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="settlements-filters-title" className="text-base font-bold text-[#06201c]">{t("commerceSettlements.filtersTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceSettlements.filtersDescription")}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setAppliedFilters(filters); setPage(1); }} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white">{t("commerceSettlements.applyFilters")}</button><button type="button" disabled={!Object.values(filters).some(Boolean) && !Object.values(appliedFilters).some(Boolean)} onClick={() => { setFilters(initialFilters); setAppliedFilters(initialFilters); setPage(1); }} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-45">{t("commerceSettlements.resetFilters")}</button></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-[#31594d]">{t("commerceSettlements.tenantId")}<input value={filters.tenantId} onChange={(event) => updateFilter("tenantId", event.target.value)} autoComplete="off" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("commerceSettlements.status")}<input value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} placeholder={t("commerceSettlements.statusPlaceholder")} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("commerceSettlements.from")}<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("commerceSettlements.to")}<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
      </div>
    </section>

    {listQuery.isPending && !listQuery.data ? <section className={card} role="status" aria-live="polite">{t("commerceSettlements.loadingList")}</section> : null}
    {listQuery.isError ? <SettlementError error={listQuery.error} retry={() => void listQuery.refetch()} busy={listQuery.isFetching} label={t("commerceSettlements.listTitle")} /> : null}
    {listQuery.data ? <SettlementList data={listQuery.data} requestedPage={page} busy={listQuery.isFetching} onPage={setPage} onSelect={setSelectedId} /> : null}

    {selectedId ? <SettlementDetails settlementId={selectedId} onClose={() => setSelectedId(null)} /> : <section className={card} aria-labelledby="settlement-detail-empty-title"><h2 id="settlement-detail-empty-title" className="text-lg font-bold text-[#06201c]">{t("commerceSettlements.detailsTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceSettlements.selectSettlement")}</p></section>}
    <SettlementConfiguration tenantId={appliedFilters.tenantId} />
    <SettlementOperations />
    <p className="text-xs leading-5 text-[#7f9d94]">{t("commerceSettlements.financialNote")}</p>
  </div>;
}

function SettlementList({ data, requestedPage, busy, onPage, onSelect }: { data: Awaited<ReturnType<typeof listSettlements>>; requestedPage: number; busy: boolean; onPage: (page: number) => void; onSelect: (id: string) => void }) {
  const { t } = useTranslation("platform");
  const pagination = getSettlementPagination(data, requestedPage, PAGE_SIZE);
  const columns = [t("commerceSettlements.id"), t("commerceSettlements.tenant"), t("commerceSettlements.period"), t("commerceSettlements.currency"), t("commerceSettlements.gross"), t("commerceSettlements.refunds"), t("commerceSettlements.commission"), t("commerceSettlements.gatewayFees"), t("commerceSettlements.fixedFees"), t("commerceSettlements.netPayout"), t("commerceSettlements.status"), t("commerceSettlements.payoutReference"), t("commerceSettlements.dates"), t("commerceSettlements.actions")];
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="settlement-list-title" aria-busy={busy}>
    <div className="border-b border-[#edf3f0] p-5"><h2 id="settlement-list-title" className="text-lg font-bold text-[#06201c]">{t("commerceSettlements.listTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceSettlements.listDescription")}</p>{busy ? <p className="mt-1 text-xs text-[#7f9d94]" role="status">{t("commerceSettlements.refreshing")}</p> : null}</div>
    <div className="overflow-x-auto"><table className="min-w-[1180px] w-full text-left text-sm"><caption className="sr-only">{t("commerceSettlements.tableCaption")}</caption><thead className="border-b border-[#e1ebe6] bg-[#f9fcfa] text-sm font-semibold text-[#31594d]"><tr>{columns.map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead><tbody>
      {data.items.length === 0 ? <tr><td colSpan={columns.length} className="px-4 py-12 text-center"><p className="font-semibold text-[#06201c]">{t("commerceSettlements.emptyTitle")}</p><p className="mt-1 text-sm text-[#52736a]">{t("commerceSettlements.emptyDescription")}</p></td></tr> : data.items.map((row) => <SettlementRow key={row.id} settlement={row} onSelect={onSelect} />)}
    </tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] p-4 text-sm text-[#52736a]"><span>{t("commerceSettlements.pageRecords", { page: pagination.page, pages: pagination.pageCount, count: pagination.total })}</span><div className="flex gap-2"><button type="button" aria-label={t("commerceSettlements.previousPage")} disabled={pagination.page <= 1 || busy} onClick={() => onPage(pagination.page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">{t("commerceSettlements.previous")}</button><button type="button" aria-label={t("commerceSettlements.nextPage")} disabled={pagination.page >= pagination.pageCount || busy} onClick={() => onPage(pagination.page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">{t("commerceSettlements.next")}</button></div></div>
  </section>;
}

function SettlementRow({ settlement, onSelect }: { settlement: SettlementResponse; onSelect: (id: string) => void }) {
  const { t } = useTranslation("platform");
  const amounts = getSettlementAmountFields(settlement);
  return <tr className="border-b border-[#edf3f0] align-top">
    <td className="px-4 py-3"><span className="font-semibold text-[#06201c]">{settlement.id}</span>{settlement.reference ? <span className="mt-1 block text-xs text-[#52736a]">{settlement.reference}</span> : null}</td>
    <td className="px-4 py-3">{settlement.tenant_id}</td><td className="px-4 py-3">{settlement.period_start}<br />{settlement.period_end}</td><td className="px-4 py-3">{settlement.currency}</td>
    <td className="px-4 py-3">{amounts.gross}</td><td className="px-4 py-3">{amounts.refunds}</td><td className="px-4 py-3">{amounts.commission}</td><td className="px-4 py-3">{amounts.gatewayFees}</td><td className="px-4 py-3">{amounts.fixedFees}</td><td className="px-4 py-3 font-semibold">{amounts.net}</td>
    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-bold text-[#31594d]">{getSettlementStatusLabel(settlement.status)}</span></td><td className="px-4 py-3">{settlement.payout_reference ?? t("commerceSettlements.notSupplied")}</td><td className="px-4 py-3">{settlement.paid_at ?? settlement.created_at}</td><td className="px-4 py-3"><button type="button" onClick={() => onSelect(settlement.id)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">{t("commerceSettlements.viewDetails")}</button></td>
  </tr>;
}

function SettlementDetails({ settlementId, onClose }: { settlementId: string; onClose: () => void }) {
  const { t } = useTranslation("platform");
  const query = useQuery({ queryKey: ["platform-commerce", "settlements", "detail", settlementId], queryFn: () => getSettlement(settlementId, platformCommerceRequest), retry: false, staleTime: 30_000 });
  return <section className={card} aria-labelledby="settlement-details-title" aria-busy={query.isFetching}>
    <div className="flex items-start justify-between gap-3"><div><h2 id="settlement-details-title" className="text-lg font-bold text-[#06201c]">{t("commerceSettlements.detailsTitle")}</h2><p className="mt-1 break-all text-sm text-[#52736a]">{settlementId}</p></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a]">{t("commerceSettlements.close")}</button></div>
    {query.isPending ? <p className="mt-4 text-sm text-[#52736a]" role="status">{t("commerceSettlements.loadingDetails")}</p> : null}
    {query.isError ? <SettlementError error={query.error} retry={() => void query.refetch()} busy={query.isFetching} label={t("commerceSettlements.detailsTitle")} /> : null}
    {query.data ? <SettlementDetailData settlement={query.data} /> : null}
  </section>;
}

function SettlementDetailData({ settlement }: { settlement: SettlementDetailResponse }) {
  const { t } = useTranslation("platform");
  const missing = t("commerceSettlements.notSupplied");
  const values: readonly [string, string][] = [
    [t("commerceSettlements.id"), settlement.id], [t("commerceSettlements.reference"), settlement.reference], [t("commerceSettlements.tenant"), settlement.tenant_id], [t("commerceSettlements.status"), getSettlementStatusLabel(settlement.status)],
    [t("commerceSettlements.periodStart"), settlement.period_start], [t("commerceSettlements.periodEnd"), settlement.period_end], [t("commerceSettlements.currency"), settlement.currency], [t("commerceSettlements.baseCurrency"), settlement.base_currency], [t("commerceSettlements.exchangeRate"), settlement.exchange_rate],
    [t("commerceSettlements.gross"), settlement.gross_amount], [t("commerceSettlements.refunds"), settlement.refund_amount], [t("commerceSettlements.commission"), settlement.commission_amount], [t("commerceSettlements.gatewayFees"), settlement.fee_amount], [t("commerceSettlements.fixedFees"), settlement.fixed_fee_amount], [t("commerceSettlements.taxCollected"), settlement.tax_collected], [t("commerceSettlements.netPayout"), settlement.net_amount],
    [t("commerceSettlements.itemCount"), String(settlement.items_count)], [t("commerceSettlements.payoutReference"), settlement.payout_reference ?? missing], [t("commerceSettlements.paidAt"), settlement.paid_at ?? missing], [t("commerceSettlements.failureReason"), settlement.failure_reason ?? missing], [t("commerceSettlements.createdAt"), settlement.created_at],
  ];
  return <>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{values.map(([label, value]) => <div key={label} className="rounded-xl border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold text-[#7f9d94]">{label}</dt><dd className="mt-1 break-words text-sm text-[#31594d]">{value}</dd></div>)}</dl>
    <SettlementItems items={settlement.items ?? []} />
    <SettlementActionPreviews actions={settlement.actions} />
  </>;
}

function SettlementItems({ items }: { items: NonNullable<SettlementDetailResponse["items"]> }) {
  const { t } = useTranslation("platform");
  return <section className="mt-5" aria-labelledby="settlement-items-title"><h3 id="settlement-items-title" className="text-base font-bold text-[#06201c]">{t("commerceSettlements.breakdown")}</h3>{items.length ? <div className="mt-2 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[800px] w-full text-left text-sm"><caption className="sr-only">{t("commerceSettlements.breakdownCaption")}</caption><thead className="bg-[#f9fcfa] text-xs font-semibold text-[#31594d]"><tr>{["kind", "payment_id", "refund_id", "charge_currency", "charge_amount", "gross", "commission", "fee", "fixed_fee", "net"].map((key) => <th key={key} scope="col" className="px-3 py-2">{t(`commerceSettlements.item.${key}`)}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[#edf3f0]">{[item.kind, item.payment_id ?? "—", item.refund_id ?? "—", item.charge_currency, item.charge_amount, item.gross, item.commission, item.fee, item.fixed_fee, item.net].map((value, index) => <td key={`${item.id}-${index}`} className="px-3 py-2">{value}</td>)}</tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-[#7f9d94]">{t("commerceSettlements.noBreakdown")}</p>}</section>;
}

function SettlementActionPreviews({ actions }: { actions?: readonly string[] }) {
  const { t } = useTranslation("platform");
  return <section className="mt-5 border-t border-[#d7e5df] pt-4" aria-labelledby="settlement-actions-title"><h3 id="settlement-actions-title" className="font-bold text-[#06201c]">{t("commerceSettlements.actions")}</h3><p className="mt-1 text-sm text-[#52736a]">{t("commerceSettlements.mutationsDisabled")}</p>{actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{actions.map((action) => <button key={action} type="button" disabled title={t("commerceSettlements.mutationsDisabled")} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{action.replaceAll("_", " ")}</button>)}</div> : null}</section>;
}

function SettlementConfiguration({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation("platform");
  const validTenant = isSettlementTenantId(tenantId);
  const query = useQuery({
    queryKey: ["platform-commerce", "settlements", "config", tenantId.trim()],
    queryFn: () => getSettlementConfig({ tenant_id: tenantId.trim() }, platformCommerceRequest),
    enabled: validTenant,
    retry: false,
    staleTime: 30_000,
  });
  const matchingConfig = query.data && settlementConfigMatchesTenant(query.data, tenantId) ? query.data : undefined;
  return <section className={card} aria-labelledby="settlement-config-title" aria-busy={query.isFetching}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="settlement-config-title" className="text-lg font-bold text-[#06201c]">{t("commerceSettlements.configTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceSettlements.configDescription")}</p></div><span className="rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-bold text-[#31594d]">{t("commerceSettlements.readOnly")}</span></div>
    {!validTenant ? <p className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">{t("commerceSettlements.configTenantPrompt")}</p> : null}
    {validTenant && query.isPending ? <p className="mt-4 text-sm text-[#52736a]" role="status">{t("commerceSettlements.loadingConfig")}</p> : null}
    {validTenant && query.isError ? <SettlementError error={query.error} retry={() => void query.refetch()} busy={query.isFetching} label={t("commerceSettlements.configTitle")} /> : null}
    {validTenant && query.data && !matchingConfig ? <p className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#9c2f24]" role="alert">{t("commerceSettlements.configScopeMismatch")}</p> : null}
    {matchingConfig ? <SettlementConfigData config={matchingConfig} /> : null}
    <button type="button" disabled title={t("commerceSettlements.mutationsDisabled")} className="mt-4 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{t("commerceSettlements.saveConfigUnavailable")}</button>
  </section>;
}

function SettlementConfigData({ config }: { config: SettlementConfigResponse }) {
  const { t } = useTranslation("platform");
  const missing = t("commerceSettlements.notSupplied");
  const account = getPayoutAccountDisplay(config) === "withheld" ? t("commerceSettlements.payoutAccountWithheld") : missing;
  const values: readonly [string, string][] = [
    [t("commerceSettlements.tenant"), config.tenant_id], [t("commerceSettlements.frequency"), config.schedule], [t("commerceSettlements.weekday"), config.weekday === undefined ? missing : String(config.weekday)], [t("commerceSettlements.monthDay"), config.month_day === undefined ? missing : String(config.month_day)],
    [t("commerceSettlements.currency"), config.currency], [t("commerceSettlements.minimumPayout"), config.min_payout], [t("commerceSettlements.commission"), config.commission_percent ?? missing], [t("commerceSettlements.effectiveCommission"), config.effective_commission_percent ?? missing], [t("commerceSettlements.fixedFees"), config.fixed_fee],
    [t("commerceSettlements.holdStatus"), config.hold ? t("commerceSettlements.yes") : t("commerceSettlements.no")], [t("commerceSettlements.payoutAccount"), account], [t("commerceSettlements.lastRun"), config.last_run_at ?? missing], [t("commerceSettlements.updatedAt"), config.updated_at ?? missing],
  ];
  return <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{values.map(([label, value]) => <div key={label} className="rounded-xl border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold text-[#7f9d94]">{label}</dt><dd className="mt-1 break-words text-sm text-[#31594d]">{value}</dd></div>)}</dl>;
}

function SettlementOperations() {
  const { t } = useTranslation("platform");
  const operations = ["run", "force", "dryRun", "verify", "export", "recordPayout", "markPaid", "markFailed", "cancel"] as const;
  return <section className={card} aria-labelledby="settlement-operations-title"><h2 id="settlement-operations-title" className="text-lg font-bold text-[#06201c]">{t("commerceSettlements.operationsTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceSettlements.mutationsDisabled")}</p><div className="mt-4 flex flex-wrap gap-2">{operations.map((operation) => <button key={operation} type="button" disabled title={t("commerceSettlements.mutationsDisabled")} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{t(`commerceSettlements.operation.${operation}`)}</button>)}</div></section>;
}

function SettlementError({ error, retry, busy, label }: { error: unknown; retry: () => void; busy: boolean; label: string }) {
  const { t } = useTranslation("platform");
  const status = error instanceof CommerceApiError ? error.status : undefined;
  return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm font-semibold text-[#b42318]">{t("commerceSettlements.couldNotLoad", { label })}</p><p className="mt-1 text-sm text-[#7f2922]">{t(`commerceSettlements.${settlementErrorKey(status)}`)}</p><button type="button" onClick={retry} disabled={busy} className="mt-3 rounded-full border border-[#e7b8b2] px-3 py-1.5 text-xs font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">{busy ? t("commerceSettlements.retrying") : t("commerceSettlements.retry")}</button></div>;
}
