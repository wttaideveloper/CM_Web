"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, listPayments } from "@ihp/commerce";
import { useTranslation } from "react-i18next";

import EnterprisePaymentDetailsPanel from "@/components/EnterprisePaymentDetailsPanel";
import { assertEnterprisePaymentListTenant, buildEnterprisePaymentParams, enterprisePaymentPageCount, enterprisePaymentQueryKeys, enterprisePaymentStatusLabel, formatEnterprisePaymentAmount, formatEnterprisePaymentDate, hasEnterprisePaymentScope, normalizeEnterprisePaymentList, ENTERPRISE_PAYMENT_PAGE_SIZE, ENTERPRISE_PAYMENT_STATUSES, type EnterprisePaymentFilters } from "@/lib/enterprise-payments";

const ENTERPRISE_COMMERCE_REQUEST = { baseUrl: "/api/enterprise-commerce" } as const;
const EMPTY_FILTERS: EnterprisePaymentFilters = { status: "", currency: "", purchaseType: "", dateFrom: "", dateTo: "" };

type EnterprisePaymentsScreenProps = { accountId: string | null; tenantId: string | null; enterpriseId: string; enterpriseName: string };

/** Renders the Enterprise-scoped, read-only Payments list and its details panel. */
export default function EnterprisePaymentsScreen({ accountId, tenantId, enterpriseId, enterpriseName }: EnterprisePaymentsScreenProps) {
  const { t } = useTranslation("enterpriseFinance");
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const params = useMemo(() => buildEnterprisePaymentParams(appliedFilters, page), [appliedFilters, page]);
  const queryKeys = useMemo(() => accountId && tenantId ? enterprisePaymentQueryKeys(accountId, tenantId, enterpriseId) : null, [accountId, tenantId, enterpriseId]);
  const paymentsQuery = useQuery({
    queryKey: queryKeys?.list(params) ?? ["enterprise-commerce", accountId ?? "unavailable-account", tenantId ?? "unresolved-tenant", enterpriseId, "payments", params],
    queryFn: async () => {
      if (!tenantId) throw new Error("Authenticated tenant is unavailable.");
      const response = normalizeEnterprisePaymentList(await listPayments(params, ENTERPRISE_COMMERCE_REQUEST), page, ENTERPRISE_PAYMENT_PAGE_SIZE);
      return assertEnterprisePaymentListTenant(response, tenantId);
    },
    enabled: hasEnterprisePaymentScope(accountId, tenantId, enterpriseId),
    staleTime: 15_000,
    retry: (failureCount, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && failureCount < 1,
  });

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  };
  const resetFilters = () => { setDraftFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setPage(1); };
  const data = paymentsQuery.data;
  const totalPages = enterprisePaymentPageCount(data?.total ?? 0, data?.page_size ?? ENTERPRISE_PAYMENT_PAGE_SIZE);

  return (
    <main className="min-w-0 space-y-5 bg-white p-4 sm:p-6 lg:p-8">
      <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7f9d94]">{t("sectionLabel")}</p><h1 className="mt-1 text-2xl font-extrabold text-[#06201c]">{t("title")}</h1><p className="mt-2 max-w-3xl text-sm text-[#52736a]">{t("description", { enterprise: enterpriseName })}</p></header>

      <form onSubmit={applyFilters} aria-labelledby="enterprise-payment-filters-heading" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
        <h2 id="enterprise-payment-filters-heading" className="text-base font-bold text-[#06201c]">{t("filters")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="block text-sm font-semibold text-[#31594d]">{t("status")}<select value={draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm"><option value="">{t("anyStatus")}</option>{ENTERPRISE_PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{localizedStatus(status, t)}</option>)}</select></label>
          <label className="block text-sm font-semibold text-[#31594d]">{t("currency")}<input value={draftFilters.currency} onChange={(event) => setDraftFilters((current) => ({ ...current, currency: event.target.value }))} placeholder={t("currencyPlaceholder")} maxLength={3} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm" /></label>
          <label className="block text-sm font-semibold text-[#31594d]">{t("purchaseType")}<input value={draftFilters.purchaseType} onChange={(event) => setDraftFilters((current) => ({ ...current, purchaseType: event.target.value }))} placeholder={t("purchaseTypePlaceholder")} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm" /></label>
          <label className="block text-sm font-semibold text-[#31594d]">{t("dateFrom")}<input type="date" value={draftFilters.dateFrom} onChange={(event) => setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm" /></label>
          <label className="block text-sm font-semibold text-[#31594d]">{t("dateTo")}<input type="date" value={draftFilters.dateTo} onChange={(event) => setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm" /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">{t("apply")}</button><button type="button" onClick={resetFilters} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#31594d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">{t("reset")}</button><p className="text-xs text-[#52736a]">{t("searchUnavailable")}</p></div>
      </form>

      <section aria-labelledby="enterprise-payment-list-heading" className="min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <h2 id="enterprise-payment-list-heading" className="px-4 pt-4 text-base font-bold text-[#06201c] sm:px-5">{t("paymentList")}</h2>
        {!accountId || !tenantId ? <p role="alert" className="m-4 rounded-xl bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]">{!accountId ? t("signIn") : t("tenantUnavailable")}</p> : null}
        {paymentsQuery.isLoading ? <div role="status" className="space-y-2 p-4"><span className="sr-only">{t("loading")}</span>{[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-[#f1f5f3]" />)}</div> : null}
        {paymentsQuery.isError ? <ErrorState error={paymentsQuery.error} fallback={t("loadError")} unauthorized={t("signIn")} forbidden={t("forbidden")} retryLabel={t("retry")} onRetry={() => void paymentsQuery.refetch()} /> : null}
        {data ? <>
          {data.items.length === 0 ? <p className="m-4 rounded-xl border border-dashed border-[#d7e5df] p-6 text-center text-sm text-[#52736a]">{t("noPayments")}</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-y border-[#edf3f0] bg-[#fbfdfc] text-xs text-[#52736a]"><tr>{[t("paymentId"), t("customer"), t("purchase"), t("itemAmount"), t("chargedAmount"), t("status"), t("paymentDate"), t("actions")].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3f0]">{data.items.map((payment) => <tr key={payment.id} className="align-top"><td className="max-w-52 break-all px-3 py-3 font-mono text-xs">{payment.id}</td><td className="px-3 py-3">{payment.customer_email || payment.customer_user_id || t("noValue")}</td><td className="px-3 py-3">{`${payment.purchase_type || t("noValue")} · ${payment.purchase_id || t("noValue")}`}</td><td className="px-3 py-3 whitespace-nowrap">{formatEnterprisePaymentAmount(payment.total_amount, payment.item_currency)}</td><td className="px-3 py-3 whitespace-nowrap">{formatEnterprisePaymentAmount(payment.charge_total, payment.charge_currency)}</td><td className="px-3 py-3">{localizedStatus(payment.status, t, payment.status_label)}</td><td className="px-3 py-3 whitespace-nowrap">{formatEnterprisePaymentDate(payment.created_at)}</td><td className="px-3 py-3"><button type="button" onClick={() => setSelectedPaymentId(payment.id)} className="whitespace-nowrap font-bold text-[#1f6a58] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">{t("viewDetails")}</button></td></tr>)}</tbody></table></div>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] px-4 py-3 text-sm text-[#52736a]"><span>{t("page", { current: page, total: totalPages, count: data.total })}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || paymentsQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 disabled:opacity-50">{t("previous")}</button><button type="button" disabled={page >= totalPages || paymentsQuery.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 disabled:opacity-50">{t("next")}</button></div></div>
        </> : null}
      </section>

      {selectedPaymentId && accountId && tenantId ? <EnterprisePaymentDetailsPanel accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} paymentId={selectedPaymentId} onClose={() => setSelectedPaymentId(null)} /> : null}
    </main>
  );
}

function localizedStatus(status: string, t: (key: string) => string, supplied?: string | null): string {
  if (supplied?.trim()) return supplied;
  const statusKeys: Record<string, string> = { created: "created", requires_action: "requiresAction", processing: "processing", authorized: "authorized", succeeded: "succeeded", partially_refunded: "partiallyRefunded", refunded: "refundedStatus", failed: "failed", cancelled: "cancelled", expired: "expired", review: "review" };
  return statusKeys[status] ? t(statusKeys[status]!) : enterprisePaymentStatusLabel(status);
}

function ErrorState({ error, fallback, unauthorized, forbidden, retryLabel, onRetry }: { error: unknown; fallback: string; unauthorized: string; forbidden: string; retryLabel: string; onRetry: () => void }) {
  const message = error instanceof CommerceApiError && error.status === 401 ? unauthorized : error instanceof CommerceApiError && error.status === 403 ? forbidden : fallback;
  return <div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]"><span>{message}</span><button type="button" onClick={onRetry} className="rounded-lg border border-[#d8a7a0] px-3 py-1.5 font-semibold">{retryLabel}</button></div>;
}
