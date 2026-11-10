/** Accepts only the documented invoice PDF download route with a UUID identifier. */
export function isPlatformInvoiceDownloadPath(path: readonly string[]): boolean {
  return path.length === 3 && path[0] === "invoices" && isUuid(path[1]) && path[2] === "download";
}

/** Builds safe no-store headers for an authenticated PDF response or an upstream error body. */
export function buildPlatformInvoiceDownloadHeaders(invoiceId: string, upstreamHeaders: Headers, successful: boolean): Headers | null {
  const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (successful) {
    const contentType = upstreamHeaders.get("content-type") ?? "";
    if (!/^application\/pdf(?:\s*;|$)/i.test(contentType)) return null;
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="invoice-${invoiceId}.pdf"`);
    return headers;
  }

  const contentType = upstreamHeaders.get("content-type");
  if (contentType && /^(application\/(?:json|problem\+json)|text\/plain)(?:\s*;|$)/i.test(contentType)) {
    headers.set("Content-Type", contentType);
  }
  const retryAfter = upstreamHeaders.get("retry-after");
  if (retryAfter && /^\d{1,6}$/.test(retryAfter)) headers.set("Retry-After", retryAfter);
  return headers;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
