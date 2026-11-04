const RESOURCE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_LIST_QUERY_KEYS = new Set([
  "page",
  "page_size",
  "status",
  "currency",
  "purchase_type",
  "purchase_id",
  "customer_user_id",
  "needs_reconciliation",
  "date_from",
  "date_to",
]);
const RESPONSE_HEADERS_TO_COPY = ["content-type", "content-language", "retry-after", "x-request-id"] as const;
const REFUND_LIST_QUERY_KEYS = new Set(["page", "page_size", "status", "payment_id", "overdue", "date_from", "date_to"]);
const INVOICE_LIST_QUERY_KEYS = new Set(["page", "page_size", "doc_type", "payment_id", "search", "date_from", "date_to"]);
const SETTLEMENT_LIST_QUERY_KEYS = new Set(["page", "page_size", "status", "date_from", "date_to"]);
const PAYMENT_REPORT_QUERY_KEYS = new Set(["date_from", "date_to", "status", "currency", "page", "page_size"]);
const REFUND_REPORT_QUERY_KEYS = new Set(["date_from", "date_to", "status", "page", "page_size"]);
const SETTLEMENT_REPORT_QUERY_KEYS = new Set(["date_from", "date_to", "status", "page", "page_size"]);
const CURRENCY_REPORT_QUERY_KEYS = new Set(["date_from", "date_to"]);
const TAX_REPORT_QUERY_KEYS = new Set(["date_from", "date_to", "group_by"]);
const TAX_REPORT_GROUPS = new Set(["tax_type", "country", "state", "name", "month", "day"]);

/** Fetch adapter used to test the server-side Enterprise payment proxy without a live backend. */
export type EnterprisePaymentProxyFetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type EnterpriseCommerceProxyFetcher = EnterprisePaymentProxyFetcher;

/** Result returned by the safe Enterprise Payments forwarding boundary. */
export type EnterprisePaymentProxyResult = {
  response: Response;
  error?: string;
};

/** Checks the exact read-only payment paths owned by the Enterprise Finance BFF. */
export function isEnterprisePaymentReadPath(path: readonly string[]): boolean {
  if (path.some((segment) => !segment)) return false;
  if (path.length === 1) return path[0] === "payments";
  if (path.length === 2) return path[0] === "payments" && RESOURCE_ID_PATTERN.test(path[1] ?? "");
  return path.length === 3
    && path[0] === "payments"
    && RESOURCE_ID_PATTERN.test(path[1] ?? "")
    && path[2] === "transactions";
}

/** Checks the read-only Finance routes exposed by the Enterprise Commerce BFF. */
export function isEnterpriseCommerceReadPath(path: readonly string[]): boolean {
  if (isEnterprisePaymentReadPath(path)) return true;
  if (path.some((segment) => !segment)) return false;
  if (path.length === 1 && path[0] === "refunds") return true;
  if (path.length === 2 && path[0] === "refunds") return RESOURCE_ID_PATTERN.test(path[1] ?? "");
  if (path.length === 1 && path[0] === "invoices") return true;
  if (path.length === 2 && path[0] === "invoices") {
    return path[1] === "templates" || RESOURCE_ID_PATTERN.test(path[1] ?? "");
  }
  if (path.length === 3 && path[0] === "invoices" && RESOURCE_ID_PATTERN.test(path[1] ?? "") && path[2] === "download") return true;
  if (path.length === 1 && path[0] === "settlements") return true;
  if (path.length === 2 && path[0] === "settlements") {
    return path[1] === "config" || RESOURCE_ID_PATTERN.test(path[1] ?? "");
  }
  if (path.length === 2 && path[0] === "payment-reports") {
    return ["payments", "refunds", "settlements", "currency"].includes(path[1] ?? "");
  }
  if (path.length === 2 && path[0] === "tax" && ["reports", "merchant-profile"].includes(path[1] ?? "")) return true;
  // Verification/export are intentionally withheld until their response contracts are documented.
  return false;
}

/** Builds a server-side upstream URL and rejects tenant overrides or undocumented filters. */
export function buildEnterprisePaymentUpstreamUrl(
  path: readonly string[],
  requestUrl: string,
  apiBaseUrl: string,
): string {
  if (!isEnterprisePaymentReadPath(path)) throw new Error("Payment resource not found.");
  const request = new URL(requestUrl);
  const queryEntries = [...request.searchParams.entries()];

  for (const [key] of queryEntries) {
    if (key === "tenant_id") throw new Error("Tenant selection is not supported.");
    if (!PAYMENT_LIST_QUERY_KEYS.has(key) || path.length !== 1) throw new Error("Unsupported payment query parameter.");
  }
  for (const key of new Set(queryEntries.map(([name]) => name))) {
    if (request.searchParams.getAll(key).length !== 1) throw new Error("Duplicate payment query parameter.");
  }
  for (const key of ["page", "page_size"]) {
    const value = request.searchParams.get(key);
    if (value !== null && (!/^\d+$/.test(value) || Number(value) < 1)) {
      throw new Error("Invalid payment pagination parameter.");
    }
  }

  const normalizedBase = apiBaseUrl.replace(/\/+$/, "");
  const apiV1Base = /\/api\/v1$/i.test(normalizedBase) ? normalizedBase : `${normalizedBase}/api/v1`;
  const upstream = new URL(`${apiV1Base}/${path.map((segment) => encodeURIComponent(segment)).join("/")}`);
  upstream.search = request.search;
  return upstream.toString();
}

/** Builds a tenant-override-free URL for an allowlisted Enterprise Commerce read route. */
export function buildEnterpriseCommerceUpstreamUrl(path: readonly string[], requestUrl: string, apiBaseUrl: string): string {
  if (!isEnterpriseCommerceReadPath(path)) throw new Error("Commerce resource not found.");
  if (isEnterprisePaymentReadPath(path)) return buildEnterprisePaymentUpstreamUrl(path, requestUrl, apiBaseUrl);
  const request = new URL(requestUrl);
  const queryEntries = [...request.searchParams.entries()];
  const queryKeys = commerceReadQueryKeys(path);

  for (const [key] of queryEntries) {
    if (key === "tenant_id") throw new Error("Tenant selection is not supported.");
    if (!queryKeys.has(key)) throw new Error("Unsupported Commerce query parameter.");
  }
  for (const key of new Set(queryEntries.map(([name]) => name))) {
    if (request.searchParams.getAll(key).length !== 1) throw new Error("Duplicate Commerce query parameter.");
  }
  for (const key of ["page", "page_size"]) {
    const value = request.searchParams.get(key);
    if (value !== null && (!/^\d+$/.test(value) || Number(value) < 1)) throw new Error("Invalid pagination parameter.");
  }
  const overdue = request.searchParams.get("overdue");
  if (overdue !== null && overdue !== "true" && overdue !== "false") throw new Error("Invalid overdue filter.");
  const taxGroup = request.searchParams.get("group_by");
  if (taxGroup !== null && !TAX_REPORT_GROUPS.has(taxGroup)) throw new Error("Invalid tax report grouping.");

  const normalizedBase = apiBaseUrl.replace(/\/+$/, "");
  const apiV1Base = /\/api\/v1$/i.test(normalizedBase) ? normalizedBase : `${normalizedBase}/api/v1`;
  const upstream = new URL(`${apiV1Base}/${path.map((segment) => encodeURIComponent(segment)).join("/")}`);
  upstream.search = request.search;
  return upstream.toString();
}

function commerceReadQueryKeys(path: readonly string[]): ReadonlySet<string> {
  if (path[0] === "refunds" && path.length === 1) return REFUND_LIST_QUERY_KEYS;
  if (path[0] === "invoices" && path.length === 1) return INVOICE_LIST_QUERY_KEYS;
  if (path[0] === "settlements" && path.length === 1) return SETTLEMENT_LIST_QUERY_KEYS;
  if (path[0] === "payment-reports" && path[1] === "payments") return PAYMENT_REPORT_QUERY_KEYS;
  if (path[0] === "payment-reports" && path[1] === "refunds") return REFUND_REPORT_QUERY_KEYS;
  if (path[0] === "payment-reports" && path[1] === "settlements") return SETTLEMENT_REPORT_QUERY_KEYS;
  if (path[0] === "payment-reports" && path[1] === "currency") return CURRENCY_REPORT_QUERY_KEYS;
  if (path[0] === "tax" && path[1] === "reports") return TAX_REPORT_QUERY_KEYS;
  return new Set<string>();
}

/** Forwards one authenticated GET without exposing credentials or caching financial data. */
export async function forwardEnterprisePaymentRead(options: {
  path: readonly string[];
  requestUrl: string;
  accessToken: string | undefined;
  apiBaseUrl: string | undefined;
  fetcher?: EnterprisePaymentProxyFetcher;
}): Promise<EnterprisePaymentProxyResult> {
  if (!isEnterprisePaymentReadPath(options.path)) return { response: jsonResponse(404, "Payment resource not found.") };
  if (!options.accessToken) return { response: jsonResponse(401, "Not authenticated.") };
  if (!options.apiBaseUrl?.trim()) return { response: jsonResponse(503, "Commerce API is not configured.") };

  let upstreamUrl: string;
  try {
    upstreamUrl = buildEnterprisePaymentUpstreamUrl(options.path, options.requestUrl, options.apiBaseUrl);
  } catch (error) {
    return { response: jsonResponse(400, error instanceof Error ? error.message : "Invalid payment request.") };
  }

  let upstream: Response;
  try {
    upstream = await (options.fetcher ?? fetch)(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${options.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { response: jsonResponse(502, "Commerce service is temporarily unavailable.") };
  }

  const headers = new Headers({ "Cache-Control": "private, no-store" });
  for (const name of RESPONSE_HEADERS_TO_COPY) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return { response: new Response(upstream.body, { status: upstream.status, headers }) };
}

/** Forwards one allowlisted Enterprise Commerce GET through the server-side Enterprise session. */
export async function forwardEnterpriseCommerceRead(options: {
  path: readonly string[];
  requestUrl: string;
  accessToken: string | undefined;
  apiBaseUrl: string | undefined;
  fetcher?: EnterpriseCommerceProxyFetcher;
}): Promise<EnterprisePaymentProxyResult> {
  if (!isEnterpriseCommerceReadPath(options.path)) return { response: jsonResponse(404, "Commerce resource not found.") };
  if (options.path[0] === "payments") return forwardEnterprisePaymentRead(options);
  if (!options.accessToken) return { response: jsonResponse(401, "Not authenticated.") };
  if (!options.apiBaseUrl?.trim()) return { response: jsonResponse(503, "Commerce API is not configured.") };

  let upstreamUrl: string;
  try {
    upstreamUrl = buildEnterpriseCommerceUpstreamUrl(options.path, options.requestUrl, options.apiBaseUrl);
  } catch (error) {
    return { response: jsonResponse(400, error instanceof Error ? error.message : "Invalid Commerce request.") };
  }

  let upstream: Response;
  try {
    upstream = await (options.fetcher ?? fetch)(upstreamUrl, {
      method: "GET",
      headers: { Accept: isInvoiceDownload(options.path) ? "application/pdf" : "application/json", Authorization: `Bearer ${options.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { response: jsonResponse(502, "Commerce service is temporarily unavailable.") };
  }

  if (isInvoiceDownload(options.path)) return forwardInvoiceDownload(upstream, options.path[1]!);
  const headers = privateNoStoreHeaders(upstream.headers);
  return { response: new Response(upstream.body, { status: upstream.status, headers }) };
}

function isInvoiceDownload(path: readonly string[]): boolean {
  return path.length === 3 && path[0] === "invoices" && path[2] === "download";
}

function privateNoStoreHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  for (const name of RESPONSE_HEADERS_TO_COPY) {
    const value = upstreamHeaders.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function forwardInvoiceDownload(upstream: Response, invoiceId: string): Promise<EnterprisePaymentProxyResult> {
  if (!upstream.ok) return { response: new Response(upstream.body, { status: upstream.status, headers: privateNoStoreHeaders(upstream.headers) }) };
  if (!/^application\/pdf(?:\s*;|$)/i.test(upstream.headers.get("content-type") ?? "")) {
    await upstream.body?.cancel();
    return { response: jsonResponse(502, "The invoice service did not return a PDF.") };
  }
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-language", "retry-after", "x-request-id"] as const) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return { response: new Response(upstream.body, { status: upstream.status, headers }) };
}

/** Creates a no-store JSON response for BFF validation and authentication failures. */
export function jsonResponse(status: number, detail: string): Response {
  return Response.json({ detail }, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Returns the standard BFF response for methods other than GET. */
export function enterprisePaymentMethodNotAllowed(): Response {
  return jsonResponse(405, "Method not allowed.");
}
