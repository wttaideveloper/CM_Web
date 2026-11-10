"use client";

import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, getInvoiceTemplates, listInvoices, type InvoiceResponse } from "@ihp/commerce";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { assertEnterpriseInvoiceListTenant, assertEnterpriseInvoiceTemplateTenant, buildEnterpriseInvoiceParams, enterpriseFinanceAmount, enterpriseFinanceDate, enterpriseFinancePageCount, enterpriseRefundsInvoicesQueryKeys, hasEnterpriseFinanceScope, normalizeEnterpriseFinancePage, ENTERPRISE_FINANCE_PAGE_SIZE, type EnterpriseInvoiceFilters } from "@/lib/enterprise-refunds-invoices";
import { buildInvoiceTemplateDisplayFields, INVOICE_TEMPLATE_PANEL_DEFAULT_EXPANDED, isInvoiceTemplateQueryEnabled } from "@/lib/enterprise-invoice-template";
import EnterpriseInvoiceDetailsPanel from "./EnterpriseInvoiceDetailsPanel";
import { FinanceRecordError, FinanceRecordPager } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;
const EMPTY_FILTERS: EnterpriseInvoiceFilters = { documentType: "", paymentId: "", search: "", dateFrom: "", dateTo: "" };

/** Renders backend-paginated, read-only invoices and an optional template-information panel. */
export default function EnterpriseInvoicesScreen({ accountId, tenantId, enterpriseId, enterpriseName }: { accountId: string | null; tenantId: string | null; enterpriseId: string; enterpriseName: string }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(INVOICE_TEMPLATE_PANEL_DEFAULT_EXPANDED);
  const params = useMemo(() => buildEnterpriseInvoiceParams(filters, page), [filters, page]);
  const keys = useMemo(() => accountId && tenantId ? enterpriseRefundsInvoicesQueryKeys(accountId, tenantId, enterpriseId) : null, [accountId, tenantId, enterpriseId]);
  const query = useQuery({
    queryKey: keys?.invoices(params) ?? ["enterprise-commerce", accountId ?? "unavailable-account", tenantId ?? "unresolved-tenant", enterpriseId, "invoices", params],
    queryFn: async () => {
      if (!tenantId) throw new Error("Authenticated tenant is unavailable.");
      const response = normalizeEnterpriseFinancePage<InvoiceResponse>(await listInvoices(params, REQUEST_OPTIONS), page, ENTERPRISE_FINANCE_PAGE_SIZE);
      return assertEnterpriseInvoiceListTenant(response, tenantId);
    },
    enabled: hasEnterpriseFinanceScope(accountId, tenantId, enterpriseId),
    staleTime: 15_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  const templatesQuery = useQuery({
    queryKey: keys?.invoiceTemplates ?? ["enterprise-commerce", accountId ?? "unavailable-account", tenantId ?? "unresolved-tenant", enterpriseId, "invoices", "templates"],
    queryFn: async () => {
      if (!tenantId) throw new Error("Authenticated tenant is unavailable.");
      return assertEnterpriseInvoiceTemplateTenant(await getInvoiceTemplates({}, REQUEST_OPTIONS), tenantId);
    },
    enabled: hasEnterpriseFinanceScope(accountId, tenantId, enterpriseId) && isInvoiceTemplateQueryEnabled(accountId, enterpriseId, showTemplates),
    staleTime: 60_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setFilters({ ...draft }); setPage(1); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(1); };
  const data = query.data;
  const pageCount = enterpriseFinancePageCount(data?.total ?? 0, data?.page_size ?? ENTERPRISE_FINANCE_PAGE_SIZE);

  return <main className="min-w-0 space-y-5 bg-white p-4 sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7f9d94]">{t("invoicesTitle")}</p><h1 className="mt-1 text-2xl font-extrabold text-[#06201c]">{t("invoicesTitle")}</h1><p className="mt-2 max-w-3xl text-sm text-[#52736a]">{t("invoicesDescription", { enterprise: enterpriseName })}</p></header>
    <form onSubmit={submit} aria-labelledby="enterprise-invoice-filters-heading" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
      <h2 id="enterprise-invoice-filters-heading" className="text-base font-bold text-[#06201c]">{t("filters")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-semibold text-[#31594d]">{t("documentType")}<select value={draft.documentType} onChange={(event) => setDraft((current) => ({ ...current, documentType: event.target.value as EnterpriseInvoiceFilters["documentType"] }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal"><option value="">{t("anyDocumentType")}</option><option value="invoice">{t("invoice")}</option><option value="credit_note">{t("creditNote")}</option><option value="debit_note">{t("debitNote")}</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("paymentId")}<input value={draft.paymentId} onChange={(event) => setDraft((current) => ({ ...current, paymentId: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("search")}<input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("dateFrom")}<input type="date" value={draft.dateFrom} onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
        <label className="text-sm font-semibold text-[#31594d]">{t("dateTo")}<input type="date" value={draft.dateTo} onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">{t("apply")}</button><button type="button" onClick={reset} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#31594d]">{t("reset")}</button></div>
    </form>
    <section aria-labelledby="enterprise-invoice-list-heading" className="min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4"><h2 id="enterprise-invoice-list-heading" className="text-base font-bold text-[#06201c]">{t("invoiceList")}</h2><button type="button" aria-expanded={showTemplates} onClick={() => setShowTemplates((current) => !current)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#1f6a58]">{showTemplates ? t("hideTemplate") : t("showTemplate")}</button></div>
      {!accountId || !tenantId ? <p role="alert" className="m-4 rounded-xl bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]">{!accountId ? t("unauthorized") : t("tenantUnavailable")}</p> : null}
      {query.isPending ? <p role="status" className="p-4 text-sm text-[#52736a]">{t("loading")}</p> : null}
      {query.isError ? <div className="m-4"><FinanceRecordError error={query.error} onRetry={() => void query.refetch()} /></div> : null}
      {data ? <>
        {data.items.length === 0 ? <p className="m-4 rounded-xl border border-[#edf3f0] p-6 text-center text-sm text-[#52736a]">{t("noInvoices")}</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><caption className="sr-only">{t("invoiceList")}</caption><thead className="border-y border-[#edf3f0] bg-[#fbfdfc] text-xs text-[#52736a]"><tr>{[t("invoiceNumber"), t("documentType"), t("paymentId"), t("total"), t("status"), t("issued"), t("actions")].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3f0]">{data.items.map((invoice) => <tr key={invoice.id} className="align-top"><td className="px-3 py-3 font-semibold">{invoice.number}</td><td className="px-3 py-3">{invoice.doc_type}</td><td className="max-w-52 break-all px-3 py-3 font-mono text-xs">{invoice.payment_id}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceAmount(invoice.total, invoice.currency)}</td><td className="px-3 py-3">{invoice.status || t("noValue")}</td><td className="whitespace-nowrap px-3 py-3">{enterpriseFinanceDate(invoice.issued_at)}</td><td className="px-3 py-3"><button type="button" onClick={() => setSelectedId(invoice.id)} className="whitespace-nowrap font-bold text-[#1f6a58] underline">{t("viewDetails")}</button></td></tr>)}</tbody></table></div>}
        <FinanceRecordPager page={data.page} pageCount={pageCount} total={data.total} busy={query.isFetching} onPage={setPage} />
      </> : null}
    </section>
    {showTemplates ? <section aria-labelledby="enterprise-invoice-templates-heading" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5"><h2 id="enterprise-invoice-templates-heading" className="text-base font-bold text-[#06201c]">{t("templateInfo")}</h2>{templatesQuery.isPending ? <p role="status" className="mt-3 text-sm text-[#52736a]">{t("templateLoading")}</p> : null}{templatesQuery.isError ? <div className="mt-3"><FinanceRecordError error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} /></div> : null}{templatesQuery.data ? <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{buildInvoiceTemplateDisplayFields(templatesQuery.data).map((field) => <div key={field.key}><dt className="text-xs font-semibold text-[#52736a]">{t(field.key)}</dt><dd className="mt-1 flex items-center gap-2 text-sm">{field.key === "logo" && field.imageUrl ? <img src={field.imageUrl} alt={t("logo")} loading="lazy" referrerPolicy="no-referrer" className="h-12 max-w-40 rounded border border-[#e1ebe6] object-contain" /> : null}{field.key === "logo" && field.unsafeLogo ? t("logoNotShown") : field.key === "logo" && field.imageUrl ? t("logoProvided") : typeof field.value === "boolean" ? field.value ? t("yes") : t("no") : field.value ?? t("noValue")}{field.swatchColor ? <span aria-label={`${t("accentColor")}: ${field.swatchColor}`} className="h-5 w-5 shrink-0 rounded border border-black/15" style={{ backgroundColor: field.swatchColor }} /> : null}</dd></div>)}</dl> : null}</section> : null}
    {selectedId && accountId && tenantId ? <EnterpriseInvoiceDetailsPanel accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} invoiceId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    <p className="text-xs text-[#7f9d94]">{t("pageLoadingHint")}</p>
  </main>;
}
