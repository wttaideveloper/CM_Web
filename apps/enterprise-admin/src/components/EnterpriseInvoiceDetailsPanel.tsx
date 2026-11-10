"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CommerceApiError, downloadInvoicePdf, getInvoice, type InvoiceResponse } from "@ihp/commerce";
import { useTranslation } from "react-i18next";

import { assertEnterpriseInvoiceTenant, enterpriseFinanceAmount, enterpriseFinanceDate, enterpriseRefundsInvoicesQueryKeys } from "@/lib/enterprise-refunds-invoices";
import { FinanceRecordError } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;

/** Shows one immutable invoice and downloads its PDF via the authenticated Enterprise BFF. */
export default function EnterpriseInvoiceDetailsPanel({ accountId, tenantId, enterpriseId, invoiceId, onClose }: { accountId: string; tenantId: string; enterpriseId: string; invoiceId: string; onClose: () => void }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const query = useQuery({
    queryKey: enterpriseRefundsInvoicesQueryKeys(accountId, tenantId, enterpriseId).invoice(invoiceId),
    queryFn: async () => assertEnterpriseInvoiceTenant(await getInvoice(invoiceId, REQUEST_OPTIONS), tenantId),
    staleTime: 15_000,
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
  });
  const download = useMutation({
    mutationFn: () => downloadInvoicePdf(invoiceId, REQUEST_OPTIONS),
    onSuccess: (blob) => saveInvoicePdf(blob, invoiceId),
  });
  return <aside className="space-y-4 rounded-2xl border border-[#d7e5df] bg-white p-4 shadow-sm sm:p-6" aria-labelledby="enterprise-invoice-details-heading">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="enterprise-invoice-details-heading" className="text-lg font-bold text-[#06201c]">{t("invoiceDetails")}</h2><p className="mt-1 break-all font-mono text-xs text-[#52736a]">{invoiceId}</p></div><button type="button" onClick={onClose} className="rounded-lg border border-[#d7e5df] px-3 py-2 text-sm font-semibold">{t("closeDetails")}</button></header>
    <button type="button" disabled={download.isPending} onClick={() => download.mutate()} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{download.isPending ? t("downloading") : t("downloadPdf")}</button>
    {download.isError ? <FinanceRecordError error={download.error} onRetry={() => download.mutate()} /> : null}
    {query.isPending ? <p role="status" className="text-sm text-[#52736a]">{t("loading")}</p> : null}
    {query.isError ? <FinanceRecordError error={query.error} onRetry={() => void query.refetch()} /> : null}
    {query.data ? <InvoiceFields invoice={query.data} /> : null}
  </aside>;
}

function InvoiceFields({ invoice }: { invoice: InvoiceResponse }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const fields: readonly [string, string][] = [
    [t("invoiceNumber"), invoice.number],
    [t("documentType"), invoice.doc_type],
    [t("status"), invoice.status],
    [t("paymentId"), invoice.payment_id],
    [t("currency"), invoice.currency],
    [t("itemCurrency"), invoice.item_currency],
    [t("subtotal"), enterpriseFinanceAmount(invoice.subtotal, invoice.currency)],
    [t("taxTotal"), enterpriseFinanceAmount(invoice.tax_total, invoice.currency)],
    [t("total"), enterpriseFinanceAmount(invoice.total, invoice.currency)],
    [t("exchangeRate"), invoice.exchange_rate],
    [t("baseCurrency"), invoice.base_currency],
    [t("baseTotal"), enterpriseFinanceAmount(invoice.base_total, invoice.base_currency)],
    [t("issued"), enterpriseFinanceDate(invoice.issued_at)],
  ];
  return <div className="space-y-5">
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold text-[#52736a]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#06201c]">{value}</dd></div>)}</dl>
    {invoice.lines?.length ? <section aria-labelledby="enterprise-invoice-lines-heading"><h3 id="enterprise-invoice-lines-heading" className="font-bold text-[#06201c]">{t("lineItems")}</h3><div className="mt-2 overflow-x-auto"><table className="min-w-[650px] w-full text-left text-xs"><thead><tr>{[t("description"), t("quantity"), t("unitPrice"), t("net"), t("tax"), t("gross")].map((label) => <th key={label} scope="col" className="border-b border-[#e1ebe6] px-2 py-2">{label}</th>)}</tr></thead><tbody>{invoice.lines.map((line, index) => <tr key={`${line.description}-${index}`} className="border-b border-[#edf3f0]"><td className="px-2 py-2">{line.description}</td><td className="px-2 py-2">{line.quantity ?? t("noValue")}</td><td className="px-2 py-2">{enterpriseFinanceAmount(line.unit_price, invoice.item_currency)}</td><td className="px-2 py-2">{enterpriseFinanceAmount(line.net, invoice.item_currency)}</td><td className="px-2 py-2">{enterpriseFinanceAmount(line.tax, invoice.item_currency)}</td><td className="px-2 py-2">{enterpriseFinanceAmount(line.gross, invoice.item_currency)}</td></tr>)}</tbody></table></div></section> : null}
    {invoice.tax_breakdown?.length ? <section aria-labelledby="enterprise-invoice-tax-heading"><h3 id="enterprise-invoice-tax-heading" className="font-bold text-[#06201c]">{t("taxBreakdown")}</h3><div className="mt-2 overflow-x-auto"><table className="min-w-[500px] w-full text-left text-xs"><thead><tr>{[t("taxType"), t("description"), t("rate"), t("taxableAmount"), t("taxAmount")].map((label) => <th key={label} scope="col" className="border-b border-[#e1ebe6] px-2 py-2">{label}</th>)}</tr></thead><tbody>{invoice.tax_breakdown.map((row, index) => <tr key={`${row.name}-${index}`} className="border-b border-[#edf3f0]"><td className="px-2 py-2">{row.tax_type ?? t("noValue")}</td><td className="px-2 py-2">{row.name}</td><td className="px-2 py-2">{row.rate}</td><td className="px-2 py-2">{enterpriseFinanceAmount(row.taxable_amount, invoice.item_currency)}</td><td className="px-2 py-2">{enterpriseFinanceAmount(row.tax_amount, invoice.item_currency)}</td></tr>)}</tbody></table></div></section> : null}
  </div>;
}

function saveInvoicePdf(blob: Blob, invoiceId: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `invoice-${invoiceId}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
