"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CommerceApiError, downloadInvoicePdf, getInvoice, getInvoiceTemplates, listInvoices, type CommerceRecord, type InvoiceResponse, type InvoiceTemplateResponse } from "@ihp/commerce";
import { platformCommerceRequest } from "@/lib/platform-commerce-client";

import { buildInvoiceListParams, getInvoiceListDisplayValues, getInvoicePagination, invoiceDocumentTypeKey, invoiceErrorKey, invoiceListColumnKeys, type InvoiceListColumnKey, type InvoiceListFilters } from "./platform-invoices-live";

const PAGE_SIZE = 20;
const initialFilters: InvoiceListFilters = { search: "", paymentId: "", tenantId: "", documentType: "", from: "", to: "" };
const card = "rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm";

/** Renders backend-authoritative invoices, details, platform template and protected PDF downloads. */
export default function PlatformInvoicesLiveScreen() {
  const { t } = useTranslation("platform");
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const params = useMemo(() => buildInvoiceListParams(filters, page, PAGE_SIZE), [filters, page]);
  const invoicesQuery = useQuery({ queryKey: ["platform-commerce", "invoices", params], queryFn: () => listInvoices(params, platformCommerceRequest), placeholderData: keepPreviousData, retry: false, staleTime: 30_000 });
  const updateFilter = <K extends keyof InvoiceListFilters>(key: K, value: InvoiceListFilters[K]) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };

  return <div className="space-y-5" aria-labelledby="invoice-management-page-title">
    <h2 id="invoice-management-page-title" className="sr-only">{t("commerceInvoices.pageTitle")}</h2>
    <section className={card} aria-labelledby="invoice-filters-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="invoice-filters-title" className="text-base font-bold text-[#06201c]">{t("commerceInvoices.filtersTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceInvoices.filtersDescription")}</p></div><button type="button" disabled={!Object.values(filters).some(Boolean)} onClick={() => { setFilters(initialFilters); setPage(1); }} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-45">{t("commerceInvoices.resetFilters")}</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-semibold text-[#31594d]">{t("commerceInvoices.searchInvoiceNumber")}<input type="search" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">{t("commerceInvoices.paymentId")}<input value={filters.paymentId} onChange={(event) => updateFilter("paymentId", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">{t("commerceInvoices.tenantId")}<input value={filters.tenantId} onChange={(event) => updateFilter("tenantId", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">{t("commerceInvoices.documentType")}<select value={filters.documentType} onChange={(event) => updateFilter("documentType", event.target.value as InvoiceListFilters["documentType"])} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="">{t("commerceInvoices.allDocumentTypes")}</option><option value="invoice">{t("commerceInvoices.invoice")}</option><option value="credit_note">{t("commerceInvoices.creditNote")}</option><option value="debit_note">{t("commerceInvoices.debitNote")}</option></select></label><label className="text-sm font-semibold text-[#31594d]">{t("commerceInvoices.fromUtc")}<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">{t("commerceInvoices.toUtc")}<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label></div>
    </section>
    {invoicesQuery.isPending && !invoicesQuery.data ? <section className={card} role="status" aria-live="polite">{t("commerceInvoices.loadingInvoices")}</section> : null}
    {invoicesQuery.isError ? <InvoiceError error={invoicesQuery.error} retry={() => void invoicesQuery.refetch()} busy={invoicesQuery.isFetching} label={t("commerceInvoices.invoiceListTitle")} /> : null}
    {invoicesQuery.data ? <InvoiceListTable data={invoicesQuery.data} requestedPage={page} busy={invoicesQuery.isFetching} onPage={setPage} onSelect={setSelectedInvoiceId} /> : null}
    {selectedInvoiceId ? <InvoiceDetailPanel invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} /> : <section className={card} aria-labelledby="invoice-detail-empty-title"><h2 id="invoice-detail-empty-title" className="text-lg font-bold text-[#06201c]">{t("commerceInvoices.detailsTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceInvoices.selectInvoice")}</p></section>}
    <InvoiceTemplateSection />
    <p className="text-xs leading-5 text-[#7f9d94]">{t("commerceInvoices.footer")}</p>
  </div>;
}

function InvoiceListTable({ data, requestedPage, busy, onPage, onSelect }: { data: Awaited<ReturnType<typeof listInvoices>>; requestedPage: number; busy: boolean; onPage: (page: number) => void; onSelect: (id: string) => void }) {
  const { t } = useTranslation("platform");
  const pagination = getInvoicePagination(data, requestedPage, PAGE_SIZE);
  const columnLabels: Record<InvoiceListColumnKey, string> = { number: t("commerceInvoices.number"), type: t("commerceInvoices.type"), total: t("commerceInvoices.totalCurrency"), status: t("commerceInvoices.status"), issued: t("commerceInvoices.issued") };
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="invoice-table-title" aria-busy={busy}>
    <div className="border-b border-[#edf3f0] p-5"><h2 id="invoice-table-title" className="text-lg font-bold text-[#06201c]">{t("commerceInvoices.invoiceListTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceInvoices.invoiceListDescription")}</p>{busy ? <p className="mt-1 text-xs text-[#7f9d94]" role="status">{t("commerceInvoices.refreshingInvoices")}</p> : null}</div>
    <div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><caption className="sr-only">{t("commerceInvoices.invoiceTableCaption")}</caption><thead className="border-b border-[#e1ebe6] bg-[#f9fcfa] text-sm font-semibold text-[#31594d]"><tr>{invoiceListColumnKeys.map((column) => <th key={column} scope="col" className="px-4 py-3">{columnLabels[column]}</th>)}<th scope="col" className="px-4 py-3">{t("commerceInvoices.action")}</th></tr></thead>
      <tbody>{data.items.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center"><p className="font-semibold text-[#06201c]">{t("commerceInvoices.noInvoices")}</p><p className="mt-1 text-sm text-[#52736a]">{t("commerceInvoices.noInvoicesDescription")}</p></td></tr> : data.items.map((invoice) => { const values = getInvoiceListDisplayValues(invoice); const typeKey = invoiceDocumentTypeKey(invoice.doc_type); return <tr key={invoice.id} className="border-b border-[#edf3f0]">{invoiceListColumnKeys.map((column) => <td key={column} className="px-4 py-3">{column === "number" ? <span className="font-semibold text-[#06201c]">{values[column]}</span> : column === "type" && typeKey ? t(`commerceInvoices.${typeKey}`) : values[column]}</td>)}<td className="px-4 py-3"><button type="button" onClick={() => onSelect(invoice.id)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">{t("commerceInvoices.viewDetails")}</button></td></tr>; })}</tbody>
    </table></div>
    <div className="flex items-center justify-between border-t border-[#edf3f0] p-4 text-sm text-[#52736a]"><span>{t("commerceInvoices.pageRecords", { page: pagination.page, pages: pagination.pageCount, count: pagination.total })}</span><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1 || busy} onClick={() => onPage(pagination.page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">{t("commerceInvoices.previous")}</button><button type="button" disabled={pagination.page >= pagination.pageCount || busy} onClick={() => onPage(pagination.page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">{t("commerceInvoices.next")}</button></div></div>
  </section>;
}

function InvoiceDetailPanel({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { t } = useTranslation("platform");
  const query = useQuery({ queryKey: ["platform-commerce", "invoices", "detail", invoiceId], queryFn: () => getInvoice(invoiceId, platformCommerceRequest), retry: false, staleTime: 30_000 });
  return <section className={card} role="region" aria-labelledby="invoice-detail-title" aria-busy={query.isFetching}><div className="flex items-start justify-between gap-3"><div><h2 id="invoice-detail-title" className="text-lg font-bold text-[#06201c]">{t("commerceInvoices.detailsTitle")}</h2><p className="mt-1 break-all text-sm text-[#52736a]">{t("commerceInvoices.invoicePrefix", { id: invoiceId })}</p></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a]">{t("commerceInvoices.close")}</button></div>
    {query.isPending ? <p className="mt-4 text-sm text-[#52736a]" role="status">{t("commerceInvoices.loadingDetails")}</p> : null}{query.isError ? <InvoiceError error={query.error} retry={() => void query.refetch()} busy={query.isFetching} label={t("commerceInvoices.detailsTitle")} /> : null}{query.data ? <InvoiceDetail invoice={query.data} /> : null}
  </section>;
}

function InvoiceDetail({ invoice }: { invoice: InvoiceResponse }) {
  const { t } = useTranslation("platform");
  const missing = t("commerceInvoices.notSupplied");
  const typeKey = invoiceDocumentTypeKey(invoice.doc_type);
  const documentType = typeKey ? t(`commerceInvoices.${typeKey}`) : invoice.doc_type;
  const values: readonly [string, string][] = [[t("commerceInvoices.documentNumber"), invoice.number], [t("commerceInvoices.type"), documentType], [t("commerceInvoices.status"), invoice.status], [t("commerceInvoices.id"), invoice.id], [t("commerceInvoices.tenantIdLabel"), invoice.tenant_id ?? missing], [t("commerceInvoices.customerUserId"), invoice.customer_user_id ?? missing], [t("commerceInvoices.paymentId"), invoice.payment_id], [t("commerceInvoices.refundId"), invoice.refund_id ?? missing], [t("commerceInvoices.parentInvoiceId"), invoice.parent_invoice_id ?? missing], [t("commerceInvoices.currency"), invoice.currency], [t("commerceInvoices.itemCurrency"), invoice.item_currency], [t("commerceInvoices.exchangeRate"), invoice.exchange_rate], [t("commerceInvoices.baseCurrency"), invoice.base_currency], [t("commerceInvoices.baseRate"), invoice.base_rate], [t("commerceInvoices.baseTotal"), invoice.base_total], [t("commerceInvoices.subtotal"), invoice.subtotal], [t("commerceInvoices.taxTotal"), invoice.tax_total], [t("commerceInvoices.total"), invoice.total], [t("commerceInvoices.issuedAt"), invoice.issued_at], [t("commerceInvoices.emailedAt"), invoice.emailed_at ?? missing], [t("commerceInvoices.emailCount"), invoice.email_count === undefined ? missing : String(invoice.email_count)], [t("commerceInvoices.notes"), invoice.notes ?? missing], [t("commerceInvoices.reason"), invoice.reason ?? missing], [t("commerceInvoices.discounts"), t("commerceInvoices.discountsNotSupplied")]];
  return <>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{values.map(([label, value]) => <div key={label} className="rounded-xl border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</dt><dd className="mt-1 break-words text-sm text-[#31594d]">{value}</dd></div>)}</dl>
    <OpaqueInvoiceRecord title={t("commerceInvoices.billingDetails")} record={invoice.billing} /><OpaqueInvoiceRecord title={t("commerceInvoices.sellerDetails")} record={invoice.supplier} />
    <InvoiceLines lines={invoice.lines ?? []} /><InvoiceTaxBreakdown rows={invoice.tax_breakdown ?? []} />
    <div className="mt-5 border-t border-[#d7e5df] pt-4"><h3 className="font-bold text-[#06201c]">{t("commerceInvoices.invoiceActions")}</h3><p className="mt-1 text-sm text-[#52736a]">{t("commerceInvoices.pdfDescription")}</p><InvoicePdfButton invoiceId={invoice.id} /><div className="mt-3 flex flex-wrap gap-2">{[["emailInvoice", "commerceInvoices.emailInvoice"], ["generateInvoice", "commerceInvoices.generateInvoice"], ["createDebitNote", "commerceInvoices.createDebitNote"], ["modifyInvoice", "commerceInvoices.modifyInvoice"], ["recalculateInvoice", "commerceInvoices.recalculateInvoice"]].map(([key, translationKey]) => <button type="button" key={key} disabled title={t("commerceInvoices.financialMutationsUnavailable")} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{t(translationKey)}</button>)}</div></div>
  </>;
}

function InvoiceLines({ lines }: { lines: NonNullable<InvoiceResponse["lines"]> }) {
  const { t } = useTranslation("platform");
  return <section className="mt-5" aria-labelledby="invoice-lines-title"><h3 id="invoice-lines-title" className="text-base font-bold text-[#06201c]">{t("commerceInvoices.lineItems")}</h3>{lines.length ? <div className="mt-2 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[700px] w-full text-left text-sm"><caption className="sr-only">{t("commerceInvoices.lineItemsCaption")}</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase text-[#52736a]"><tr><th className="px-3 py-2">{t("commerceInvoices.description")}</th><th className="px-3 py-2">{t("commerceInvoices.category")}</th><th className="px-3 py-2">{t("commerceInvoices.quantity")}</th><th className="px-3 py-2">{t("commerceInvoices.unitPrice")}</th><th className="px-3 py-2">{t("commerceInvoices.net")}</th><th className="px-3 py-2">{t("commerceInvoices.tax")}</th><th className="px-3 py-2">{t("commerceInvoices.gross")}</th></tr></thead><tbody>{lines.map((line, index) => <tr key={`${line.description}-${index}`} className="border-t border-[#edf3f0]"><td className="px-3 py-2">{line.description}</td><td className="px-3 py-2">{line.category ?? t("commerceInvoices.notSupplied")}</td><td className="px-3 py-2">{line.quantity ?? t("commerceInvoices.notSupplied")}</td><td className="px-3 py-2">{line.unit_price}</td><td className="px-3 py-2">{line.net}</td><td className="px-3 py-2">{line.tax}</td><td className="px-3 py-2">{line.gross}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-[#7f9d94]">{t("commerceInvoices.noLineItems")}</p>}</section>;
}

function InvoiceTaxBreakdown({ rows }: { rows: NonNullable<InvoiceResponse["tax_breakdown"]> }) {
  const { t } = useTranslation("platform");
  return <section className="mt-5" aria-labelledby="invoice-tax-title"><h3 id="invoice-tax-title" className="text-base font-bold text-[#06201c]">{t("commerceInvoices.taxBreakdown")}</h3>{rows.length ? <div className="mt-2 overflow-x-auto rounded-xl border border-[#edf3f0]"><table className="min-w-[600px] w-full text-left text-sm"><caption className="sr-only">{t("commerceInvoices.taxBreakdownCaption")}</caption><thead className="bg-[#f9fcfa] text-xs font-bold uppercase text-[#52736a]"><tr><th className="px-3 py-2">{t("commerceInvoices.name")}</th><th className="px-3 py-2">{t("commerceInvoices.taxType")}</th><th className="px-3 py-2">{t("commerceInvoices.rate")}</th><th className="px-3 py-2">{t("commerceInvoices.taxableAmount")}</th><th className="px-3 py-2">{t("commerceInvoices.taxAmount")}</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.name}-${index}`} className="border-t border-[#edf3f0]"><td className="px-3 py-2">{row.name}</td><td className="px-3 py-2">{row.tax_type ?? t("commerceInvoices.notSupplied")}</td><td className="px-3 py-2">{row.rate}</td><td className="px-3 py-2">{row.taxable_amount}</td><td className="px-3 py-2">{row.tax_amount}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-[#7f9d94]">{t("commerceInvoices.noTaxBreakdown")}</p>}</section>;
}

function OpaqueInvoiceRecord({ title, record }: { title: string; record?: CommerceRecord | null }) {
  const { t } = useTranslation("platform");
  const entries = record ? Object.entries(record) : [];
  return <section className="mt-5" aria-label={title}><h3 className="text-base font-bold text-[#06201c]">{title}</h3>{entries.length ? <dl className="mt-2 grid gap-2 sm:grid-cols-2">{entries.map(([key, value]) => <div key={key} className="rounded-lg border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold text-[#7f9d94]">{key}</dt><dd className="mt-1 break-words text-sm text-[#31594d]">{typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? t("commerceInvoices.notSupplied"))}</dd></div>)}</dl> : <p className="mt-1 text-sm text-[#7f9d94]">{t("commerceInvoices.notSuppliedPeriod")}</p>}<p className="mt-1 text-xs text-[#7f9d94]">{t("commerceInvoices.displayedAsReturned")}</p></section>;
}

function InvoicePdfButton({ invoiceId }: { invoiceId: string }) {
  const { t } = useTranslation("platform");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadInvoicePdf(invoiceId, platformCommerceRequest);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (downloadError) {
      setError(t(`commerceInvoices.${invoiceErrorKey(downloadError instanceof CommerceApiError ? downloadError.status : undefined)}`));
    } finally {
      setBusy(false);
    }
  };
  return <div className="mt-3"><button type="button" onClick={() => void download()} disabled={busy} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{busy ? t("commerceInvoices.downloading") : t("commerceInvoices.downloadPdf")}</button>{error ? <p className="mt-2 text-sm text-[#b42318]" role="alert">{error}</p> : null}</div>;
}

function InvoiceTemplateSection() {
  const { t } = useTranslation("platform");
  const query = useQuery({ queryKey: ["platform-commerce", "invoices", "templates", "platform"], queryFn: () => getInvoiceTemplates({}, platformCommerceRequest), retry: false, staleTime: 30_000 });
  return <section className={card} aria-labelledby="invoice-template-title" aria-busy={query.isFetching}><div className="flex items-start justify-between gap-3"><div><h2 id="invoice-template-title" className="text-lg font-bold text-[#06201c]">{t("commerceInvoices.templateTitle")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("commerceInvoices.templateDescription")}</p></div><span className="rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-bold text-[#31594d]">{t("commerceInvoices.readOnly")}</span></div>
    {query.isPending ? <p className="mt-4 text-sm text-[#52736a]" role="status">{t("commerceInvoices.loadingTemplate")}</p> : null}{query.isError ? <InvoiceError error={query.error} retry={() => void query.refetch()} busy={query.isFetching} label={t("commerceInvoices.templateTitle")} /> : null}{query.data ? <InvoiceTemplate template={query.data} /> : null}
    <button type="button" disabled className="mt-4 rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{t("commerceInvoices.saveTemplateUnavailable")}</button>
  </section>;
}

function InvoiceTemplate({ template }: { template: InvoiceTemplateResponse }) {
  const { t } = useTranslation("platform");
  const missing = t("commerceInvoices.notSupplied");
  const fields: readonly [string, string][] = [[t("commerceInvoices.templateScope"), template.tenant_id ?? (template.is_default ? t("commerceInvoices.platformDefault") : missing)], [t("commerceInvoices.defaultTemplate"), template.is_default === undefined ? missing : template.is_default ? t("commerceInvoices.yes") : t("commerceInvoices.no")], [t("commerceInvoices.displayName"), template.display_name ?? missing], [t("commerceInvoices.logoUrl"), template.logo_url ?? missing], [t("commerceInvoices.address"), template.address ?? missing], [t("commerceInvoices.footerText"), template.footer_text ?? missing], [t("commerceInvoices.terms"), template.terms ?? missing], [t("commerceInvoices.numberPrefix"), template.number_prefix ?? missing], [t("commerceInvoices.locale"), template.locale ?? missing], [t("commerceInvoices.accentColor"), template.accent_color ?? missing], [t("commerceInvoices.showExchangeRate"), template.show_exchange_rate === undefined ? missing : template.show_exchange_rate ? t("commerceInvoices.yes") : t("commerceInvoices.no")]];
  return fields.every(([, value]) => value === missing) ? <p className="mt-4 text-sm text-[#52736a]">{t("commerceInvoices.emptyTemplate")}</p> : <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label, value]) => <div key={label} className="rounded-xl border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</dt><dd className="mt-1 break-words text-sm text-[#31594d]">{value}</dd></div>)}</dl>;
}

function InvoiceError({ error, retry, busy, label }: { error: unknown; retry: () => void; busy: boolean; label: string }) {
  const { t } = useTranslation("platform");
  const status = error instanceof CommerceApiError ? error.status : undefined;
  return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm font-semibold text-[#b42318]">{t("commerceInvoices.couldNotLoad", { label })}</p><p className="mt-1 text-sm text-[#7f2922]">{t(`commerceInvoices.${invoiceErrorKey(status)}`)}</p><button type="button" onClick={retry} disabled={busy} className="mt-3 rounded-full border border-[#e7b8b2] px-3 py-1.5 text-xs font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">{busy ? t("commerceInvoices.retrying") : t("commerceInvoices.retry")}</button></div>;
}
