export const invoiceDocumentTypes = ["Invoice", "Credit Note", "Debit Note"] as const;
export type InvoiceDocumentType = (typeof invoiceDocumentTypes)[number];

export const invoiceActionNames = [
  "view_invoice",
  "download_pdf",
  "email_invoice",
  "generate_invoice",
  "create_debit_note",
  "view_credit_notes",
] as const;

export type InvoiceActionName = (typeof invoiceActionNames)[number];

export const invoiceActionLabels: Record<InvoiceActionName, string> = {
  view_invoice: "View invoice",
  download_pdf: "Download PDF",
  email_invoice: "Email invoice",
  generate_invoice: "Generate invoice",
  create_debit_note: "Create debit note",
  view_credit_notes: "View related credit notes",
};

export type InvoicePreview = {
  id: string;
  invoiceNumber: string;
  documentType: InvoiceDocumentType;
  customer: string;
  enterprise: string;
  paymentReference: string;
  issueDate: string;
  currency: string;
  totalAmount: string;
  status: string;
  seller: string;
  offering: string;
  subtotal: string;
  discounts: string;
  taxBreakdown: string;
  exchangeRate: string;
  baseCurrencyAmount: string;
  relatedNotes: string;
  templateBranding: string;
  actions: readonly InvoiceActionName[];
};

/** No invoice records are fabricated before the documented invoice APIs are connected. */
export const invoicePreviews: readonly InvoicePreview[] = [];

/** Maps backend action codes to UI labels without enabling an invoice mutation locally. */
export function getInvoiceActionLabel(action: InvoiceActionName): string {
  return invoiceActionLabels[action];
}

/** Filters only invoice records already supplied by an authoritative response. */
export function filterInvoices(
  invoices: readonly InvoicePreview[],
  filters: { search: string; enterprise: string; documentType: InvoiceDocumentType | ""; from?: string; to?: string },
) {
  const search = filters.search.trim().toLowerCase();
  const enterprise = filters.enterprise.trim().toLowerCase();
  return invoices.filter((invoice) => {
    const matchesSearch = !search || `${invoice.invoiceNumber} ${invoice.paymentReference}`.toLowerCase().includes(search);
    const matchesEnterprise = !enterprise || invoice.enterprise.toLowerCase().includes(enterprise);
    const matchesDocumentType = !filters.documentType || invoice.documentType === filters.documentType;
    const invoiceDate = invoice.issueDate.slice(0, 10);
    const matchesFrom = !filters.from || invoiceDate >= filters.from;
    const matchesTo = !filters.to || invoiceDate <= filters.to;
    return matchesSearch && matchesEnterprise && matchesDocumentType && matchesFrom && matchesTo;
  });
}
