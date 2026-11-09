import type { InvoiceListParams, InvoiceListResponse, InvoiceResponse } from "@ihp/commerce";

/** Filter state limited to the deployed invoice collection query contract. */
export type InvoiceListFilters = {
  search: string;
  paymentId: string;
  tenantId: string;
  documentType: "" | "invoice" | "credit_note" | "debit_note";
  from: string;
  to: string;
};

export const invoiceListColumnKeys = ["number", "type", "total", "status", "issued"] as const;
export type InvoiceListColumnKey = typeof invoiceListColumnKeys[number];

/** Returns the concise list-cell values in the order used by the responsive invoice table. */
export function getInvoiceListDisplayValues(invoice: Pick<InvoiceResponse, "number" | "doc_type" | "total" | "currency" | "status" | "issued_at">): Record<InvoiceListColumnKey, string> {
  return {
    number: invoice.number,
    type: invoice.doc_type,
    total: `${invoice.total} ${invoice.currency}`,
    status: invoice.status,
    issued: invoice.issued_at,
  };
}

/** Returns a translated label for known document types while preserving future backend values. */
export function invoiceDocumentTypeKey(value: string): "invoice" | "creditNote" | "debitNote" | null {
  if (value === "invoice") return "invoice";
  if (value === "credit_note") return "creditNote";
  if (value === "debit_note") return "debitNote";
  return null;
}

/** Maps API failures to safe invoice-screen messages without rendering raw server details. */
export function invoiceErrorKey(status: number | undefined): "sessionExpired" | "accessDenied" | "resourceNotFound" | "invalidRequest" | "dataUnavailable" {
  if (status === 401) return "sessionExpired";
  if (status === 403) return "accessDenied";
  if (status === 404) return "resourceNotFound";
  if (status === 422) return "invalidRequest";
  return "dataUnavailable";
}

/** Converts a date input into a UTC boundary accepted by the deployed invoice API. */
export function invoiceDateTime(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(`${value}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

/** Builds only documented invoice-list filters and pagination. */
export function buildInvoiceListParams(filters: InvoiceListFilters, page: number, pageSize: number): InvoiceListParams {
  return {
    search: filters.search || undefined,
    payment_id: filters.paymentId || undefined,
    tenant_id: filters.tenantId || undefined,
    doc_type: filters.documentType || undefined,
    date_from: invoiceDateTime(filters.from),
    date_to: invoiceDateTime(filters.to, true),
    page,
    page_size: pageSize,
  };
}

/** Uses valid response pagination or the request values when metadata is absent. */
export function getInvoicePagination(response: Pick<InvoiceListResponse, "items" | "total"> & Partial<Pick<InvoiceListResponse, "page" | "page_size">>, requestedPage: number, requestedPageSize: number) {
  const page = Number.isInteger(response.page) && (response.page ?? 0) > 0 ? response.page! : requestedPage;
  const pageSize = Number.isInteger(response.page_size) && (response.page_size ?? 0) > 0 ? response.page_size! : requestedPageSize;
  const total = Number.isInteger(response.total) && response.total >= 0 ? response.total : response.items.length;
  return { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Formats backend action names for read-only display without enabling operations. */
export function invoiceActionLabel(action: string): string {
  const labels: Record<string, string> = {
    view_invoice: "View invoice",
    download_pdf: "Download PDF",
    email_invoice: "Email invoice",
    generate_invoice: "Generate invoice",
    create_debit_note: "Create debit note",
    view_credit_notes: "View credit notes",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}
