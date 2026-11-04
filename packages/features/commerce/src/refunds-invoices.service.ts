import { commerceGet, commerceGetResponse, commercePathSegment, type CommerceRequestOptions } from "./commerce-client";
import { CommerceApiError } from "./commerce-response";
import type { InvoiceListParams, InvoiceListResponse, InvoiceResponse, InvoiceTemplateParams, InvoiceTemplateResponse, RefundListParams, RefundListResponse, RefundResponse } from "./refunds-invoices.types";

/** Lists refunds using the documented status, tenant, payment and date filters. */
export function listRefunds(params: RefundListParams = {}, options?: CommerceRequestOptions): Promise<RefundListResponse> {
  return commerceGet<RefundListResponse>("/refunds", params, options);
}

/** Retrieves one refund by its documented UUID identifier. */
export function getRefund(refundId: string, options?: CommerceRequestOptions): Promise<RefundResponse> {
  return commerceGet<RefundResponse>(`/refunds/${commercePathSegment(refundId, "refundId")}`, undefined, options);
}

/** Lists invoices, credit notes and debit notes with documented filters. */
export function listInvoices(params: InvoiceListParams = {}, options?: CommerceRequestOptions): Promise<InvoiceListResponse> {
  return commerceGet<InvoiceListResponse>("/invoices", params, options);
}

/** Retrieves one invoice document by its documented UUID identifier. */
export function getInvoice(invoiceId: string, options?: CommerceRequestOptions): Promise<InvoiceResponse> {
  return commerceGet<InvoiceResponse>(`/invoices/${commercePathSegment(invoiceId, "invoiceId")}`, undefined, options);
}

/** Retrieves the platform or enterprise invoice template configuration. */
export function getInvoiceTemplates(params: InvoiceTemplateParams = {}, options?: CommerceRequestOptions): Promise<InvoiceTemplateResponse> {
  return commerceGet<InvoiceTemplateResponse>("/invoices/templates", params, options);
}

/** Downloads one immutable invoice PDF through the configured authenticated application transport. */
export async function downloadInvoicePdf(invoiceId: string, options?: CommerceRequestOptions): Promise<Blob> {
  const response = await commerceGetResponse(
    `/invoices/${commercePathSegment(invoiceId, "invoiceId")}/download`,
    undefined,
    { ...options, accept: "application/pdf" },
  );
  if (!/^application\/pdf(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")) {
    throw new CommerceApiError(502, "The invoice service did not return a PDF.");
  }
  return response.blob();
}
