import assert from "node:assert/strict";
import test from "node:test";

const CHAT_API_BASE_URL = "https://chat.example.test/api/v1";
const PAYMENT_ID = "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174";

async function getProxyHelpers() {
  return import(new URL("./platform-commerce-proxy.ts", import.meta.url).href);
}

test("Platform BFF forwards a payment detail request through the server bridge", async () => {
  const { buildPlatformPaymentProxyRequest } = await getProxyHelpers();
  const proxyRequest = buildPlatformPaymentProxyRequest(
    ["payments", PAYMENT_ID],
    `http://localhost:3002/api/platform-super-admin/commerce/payments/${PAYMENT_ID}`,
    CHAT_API_BASE_URL,
  );
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const mockRequestSuperAdminUpstreamJson = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { status: 200, body: { id: PAYMENT_ID } };
  };

  const response = await mockRequestSuperAdminUpstreamJson(proxyRequest.upstreamUrl, proxyRequest.init);

  assert.equal(response.status, 200);
  assert.equal(calls[0]?.url, `https://chat.example.test/api/v1/payments/${PAYMENT_ID}`);
  assert.equal(calls[0]?.init.method, "GET");
  assert.deepEqual(calls[0]?.init.headers, { Accept: "application/json" });
  assert.equal("Authorization" in (calls[0]?.init.headers ?? {}), false);
});

test("Platform BFF allowlists report, tax report, audit and reconciliation GET resources only", async () => {
  const { isPlatformCommerceReadPath, buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const runId = "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174";
  const allowed = [
    ["payment-reports", "payments"], ["payment-reports", "refunds"], ["payment-reports", "settlements"],
    ["payment-reports", "currency"], ["payment-reports", "exchange-rates"], ["payment-reports", "reconciliation"],
    ["tax", "reports"], ["finance", "audit"], ["finance", "reconciliation"], ["finance", "reconciliation", runId],
  ];
  for (const path of allowed) assert.equal(isPlatformCommerceReadPath(path), true, path.join("/"));
  for (const path of [["finance", "export"], ["finance", "audit", "export"], ["tax", "reports", "export"], ["payment-reports", "payments", "export"], ["finance", "reconciliation", "not-a-uuid", "resolve"]]) {
    assert.equal(isPlatformCommerceReadPath(path), false, path.join("/"));
  }
  const request = buildPlatformCommerceProxyRequest(
    ["payment-reports", "payments"],
    "http://localhost:3002/api/platform-super-admin/commerce/payment-reports/payments?date_from=2026-10-01&page=2&page_size=25",
    CHAT_API_BASE_URL,
  );
  assert.equal(request.upstreamUrl, "https://chat.example.test/api/v1/payment-reports/payments?date_from=2026-10-01&page=2&page_size=25");
  assert.equal(request.init.method, "GET");
  assert.deepEqual(request.init.headers, { Accept: "application/json" });
  assert.equal("Authorization" in (request.init.headers ?? {}), false);
});

test("Platform BFF forwards only read-only settlement list, detail and config paths", async () => {
  const { isPlatformCommerceReadPath, buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const settlementId = "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174";
  for (const path of [["settlements"], ["settlements", settlementId], ["settlements", "config"]]) {
    assert.equal(isPlatformCommerceReadPath(path), true);
  }
  for (const path of [["settlements", "not-a-uuid"], ["settlements", settlementId, "pay"], ["settlements", "run"]]) {
    assert.equal(isPlatformCommerceReadPath(path), false);
  }

  const requests = [
    buildPlatformCommerceProxyRequest(["settlements"], "http://localhost:3002/api/platform-super-admin/commerce/settlements?tenant_id=tenant-1&status=completed&page=2&page_size=25", CHAT_API_BASE_URL),
    buildPlatformCommerceProxyRequest(["settlements", settlementId], `http://localhost:3002/api/platform-super-admin/commerce/settlements/${settlementId}`, CHAT_API_BASE_URL),
    buildPlatformCommerceProxyRequest(["settlements", "config"], "http://localhost:3002/api/platform-super-admin/commerce/settlements/config?tenant_id=tenant-1", CHAT_API_BASE_URL),
  ];
  assert.equal(requests[0]?.upstreamUrl, "https://chat.example.test/api/v1/settlements?tenant_id=tenant-1&status=completed&page=2&page_size=25");
  assert.equal(requests[1]?.upstreamUrl, `https://chat.example.test/api/v1/settlements/${settlementId}`);
  assert.equal(requests[2]?.upstreamUrl, "https://chat.example.test/api/v1/settlements/config?tenant_id=tenant-1");
  for (const request of requests) {
    assert.equal(request.init.method, "GET");
    assert.deepEqual(request.init.headers, { Accept: "application/json" });
    assert.equal("Authorization" in (request.init.headers ?? {}), false);
  }
});

test("Platform BFF forwards nested gateway history with query parameters", async () => {
  const { buildPlatformPaymentProxyRequest } = await getProxyHelpers();
  const proxyRequest = buildPlatformPaymentProxyRequest(
    ["payments", PAYMENT_ID, "transactions"],
    `http://localhost:3002/api/platform-super-admin/commerce/payments/${PAYMENT_ID}/transactions?include=attempts`,
    CHAT_API_BASE_URL,
  );

  assert.equal(
    proxyRequest.upstreamUrl,
    `https://chat.example.test/api/v1/payments/${PAYMENT_ID}/transactions?include=attempts`,
  );
  assert.equal(proxyRequest.init.method, "GET");
});

test("Payment BFF allowlist rejects unrelated or malformed paths", async () => {
  const { isPlatformCommerceReadPath, buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  assert.equal(isPlatformCommerceReadPath(["payments"]), true);
  assert.equal(isPlatformCommerceReadPath(["payments", PAYMENT_ID]), true);
  assert.equal(isPlatformCommerceReadPath(["payments", PAYMENT_ID, "transactions"]), true);
  assert.equal(isPlatformCommerceReadPath(["payments", "payment-123"]), false);
  assert.equal(isPlatformCommerceReadPath(["payments", "payment-123", "transactions"]), false);
  assert.equal(isPlatformCommerceReadPath(["payments", "46fcd847-ee32-4f75-bbc8-a3cbb9d6a17z"]), false);
  assert.throws(() => buildPlatformCommerceProxyRequest(["payments", "payment-123"], "https://platform.test", CHAT_API_BASE_URL));
  assert.equal(isPlatformCommerceReadPath(["payment-reports", "overview"]), true);
  assert.equal(isPlatformCommerceReadPath(["finance", "gateway-status"]), true);
  assert.equal(isPlatformCommerceReadPath(["currencies"]), true);
  assert.equal(isPlatformCommerceReadPath(["currencies", "admin", "all"]), true);
  assert.equal(isPlatformCommerceReadPath(["currencies", "base"]), true);
  assert.equal(isPlatformCommerceReadPath(["currencies", "rates"]), true);
  assert.equal(isPlatformCommerceReadPath(["currencies", "rates", "history"]), true);
  assert.equal(isPlatformCommerceReadPath(["refunds", "refund-123"]), false);
  assert.equal(isPlatformCommerceReadPath(["payments", "payment-123", "refunds"]), false);
  assert.equal(isPlatformCommerceReadPath(["currencies", "rates", "history", "extra"]), false);
});

test("Platform BFF forwards paginated currency history without browser credentials", async () => {
  const { buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const proxyRequest = buildPlatformCommerceProxyRequest(
    ["currencies", "rates", "history"],
    "http://localhost:3002/api/platform-super-admin/commerce/currencies/rates/history?quote=USD&page=2&page_size=25",
    CHAT_API_BASE_URL,
  );

  assert.equal(
    proxyRequest.upstreamUrl,
    "https://chat.example.test/api/v1/currencies/rates/history?quote=USD&page=2&page_size=25",
  );
  assert.deepEqual(proxyRequest.init.headers, { Accept: "application/json" });
  assert.equal("Authorization" in (proxyRequest.init.headers ?? {}), false);
});

test("Platform BFF forwards gateway status without browser credentials", async () => {
  const { buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const proxyRequest = buildPlatformCommerceProxyRequest(
    ["finance", "gateway-status"],
    "http://localhost:3002/api/platform-super-admin/commerce/finance/gateway-status",
    CHAT_API_BASE_URL,
  );

  assert.equal(proxyRequest.upstreamUrl, "https://chat.example.test/api/v1/finance/gateway-status");
  assert.equal(proxyRequest.init.method, "GET");
  assert.deepEqual(proxyRequest.init.headers, { Accept: "application/json" });
  assert.equal("Authorization" in (proxyRequest.init.headers ?? {}), false);
});

test("Platform BFF forwards the overview report with supported query parameters", async () => {
  const { buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const proxyRequest = buildPlatformCommerceProxyRequest(
    ["payment-reports", "overview"],
    "http://localhost:3002/api/platform-super-admin/commerce/payment-reports/overview?date_from=2026-01-01&tenant_id=tenant-7",
    CHAT_API_BASE_URL,
  );

  assert.equal(
    proxyRequest.upstreamUrl,
    "https://chat.example.test/api/v1/payment-reports/overview?date_from=2026-01-01&tenant_id=tenant-7",
  );
  assert.equal(proxyRequest.init.method, "GET");
  assert.deepEqual(proxyRequest.init.headers, { Accept: "application/json" });
});

test("Platform BFF allows only the documented read-only tax paths", async () => {
  const { isPlatformCommerceReadPath } = await getProxyHelpers();
  const ruleId = "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174";
  const newerUuid = "0192ac34-1234-7abc-8def-0123456789ab";
  assert.equal(isPlatformCommerceReadPath(["tax", "rules"]), true);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", ruleId, "versions"]), true);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", newerUuid, "versions"]), true);
  assert.equal(isPlatformCommerceReadPath(["tax", "history"]), true);
  assert.equal(isPlatformCommerceReadPath(["tax", "exemptions"]), true);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", "not-a-uuid", "versions"]), false);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", ruleId]), false);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", ruleId, "versions", "extra"]), false);
  assert.equal(isPlatformCommerceReadPath(["tax", "calculate"]), false);
});

test("Platform BFF allows refund list and UUID detail only", async () => {
  const { isPlatformCommerceReadPath, buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const refundId = "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174";
  assert.equal(isPlatformCommerceReadPath(["refunds"]), true);
  assert.equal(isPlatformCommerceReadPath(["refunds", refundId]), true);
  assert.equal(isPlatformCommerceReadPath(["refunds", "not-a-uuid"]), false);
  assert.equal(isPlatformCommerceReadPath(["refunds", refundId, "decision"]), false);

  const list = buildPlatformCommerceProxyRequest(
    ["refunds"],
    "http://localhost:3002/api/platform-super-admin/commerce/refunds?status=processing&payment_id=46fcd847-ee32-4f75-bbc8-a3cbb9d6a174&page=2&page_size=20",
    CHAT_API_BASE_URL,
  );
  assert.equal(list.upstreamUrl, "https://chat.example.test/api/v1/refunds?status=processing&payment_id=46fcd847-ee32-4f75-bbc8-a3cbb9d6a174&page=2&page_size=20");
  assert.equal(list.init.method, "GET");
  assert.deepEqual(list.init.headers, { Accept: "application/json" });
  assert.equal("Authorization" in (list.init.headers ?? {}), false);

  const detail = buildPlatformCommerceProxyRequest(
    ["refunds", refundId],
    `http://localhost:3002/api/platform-super-admin/commerce/refunds/${refundId}`,
    CHAT_API_BASE_URL,
  );
  assert.equal(detail.upstreamUrl, `https://chat.example.test/api/v1/refunds/${refundId}`);
});

test("Platform BFF allows invoice list, detail, templates and PDF only", async () => {
  const { isPlatformCommerceReadPath, buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const invoiceId = "0192ac34-1234-7abc-8def-0123456789ab";
  assert.equal(isPlatformCommerceReadPath(["invoices"]), true);
  assert.equal(isPlatformCommerceReadPath(["invoices", "templates"]), true);
  assert.equal(isPlatformCommerceReadPath(["invoices", invoiceId]), true);
  assert.equal(isPlatformCommerceReadPath(["invoices", invoiceId, "download"]), true);
  assert.equal(isPlatformCommerceReadPath(["invoices", "not-a-uuid"]), false);
  assert.equal(isPlatformCommerceReadPath(["invoices", invoiceId, "email"]), false);
  assert.equal(isPlatformCommerceReadPath(["invoices", "templates", "save"]), false);

  const list = buildPlatformCommerceProxyRequest(
    ["invoices"],
    "http://localhost:3002/api/platform-super-admin/commerce/invoices?doc_type=credit_note&search=INV-10&page=2&page_size=20",
    CHAT_API_BASE_URL,
  );
  assert.equal(list.upstreamUrl, "https://chat.example.test/api/v1/invoices?doc_type=credit_note&search=INV-10&page=2&page_size=20");
  assert.deepEqual(list.init.headers, { Accept: "application/json" });
  assert.equal("Authorization" in list.init.headers, false);

  const download = buildPlatformCommerceProxyRequest(
    ["invoices", invoiceId, "download"],
    `http://localhost:3002/api/platform-super-admin/commerce/invoices/${invoiceId}/download`,
    CHAT_API_BASE_URL,
  );
  assert.equal(download.upstreamUrl, `https://chat.example.test/api/v1/invoices/${invoiceId}/download`);
  assert.deepEqual(download.init.headers, { Accept: "application/pdf" });
  assert.equal(download.init.method, "GET");
});

test("invoice PDF response headers enforce a safe attachment filename and no-store", async () => {
  const { buildPlatformInvoiceDownloadHeaders } = await import(new URL("./platform-invoice-download.ts", import.meta.url).href);
  const headers = buildPlatformInvoiceDownloadHeaders("0192ac34-1234-7abc-8def-0123456789ab", new Headers({ "content-type": "application/pdf" }), true);
  assert.ok(headers);
  assert.equal(headers.get("content-type"), "application/pdf");
  assert.equal(headers.get("content-disposition"), 'attachment; filename="invoice-0192ac34-1234-7abc-8def-0123456789ab.pdf"');
  assert.equal(headers.get("cache-control"), "no-store");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(buildPlatformInvoiceDownloadHeaders("0192ac34-1234-7abc-8def-0123456789ab", new Headers({ "content-type": "application/json" }), true), null);
});

test("Platform BFF forwards nested tax versions and filters without browser credentials", async () => {
  const { buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const ruleId = "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174";
  const versions = buildPlatformCommerceProxyRequest(
    ["tax", "rules", ruleId, "versions"],
    `http://localhost:3002/api/platform-super-admin/commerce/tax/rules/${ruleId}/versions`,
    CHAT_API_BASE_URL,
  );
  assert.equal(versions.upstreamUrl, `https://chat.example.test/api/v1/tax/rules/${ruleId}/versions`);
  assert.equal(versions.init.method, "GET");

  const history = buildPlatformCommerceProxyRequest(
    ["tax", "history"],
    "http://localhost:3002/api/platform-super-admin/commerce/tax/history?country=IN&tax_type=GST&page=2&page_size=50",
    CHAT_API_BASE_URL,
  );
  assert.equal(history.upstreamUrl, "https://chat.example.test/api/v1/tax/history?country=IN&tax_type=GST&page=2&page_size=50");
  assert.deepEqual(history.init.headers, { Accept: "application/json" });
  assert.equal("Authorization" in (history.init.headers ?? {}), false);
});

test("Platform BFF forwards exact rules and exemption collection filters", async () => {
  const { buildPlatformCommerceProxyRequest } = await getProxyHelpers();
  const rules = buildPlatformCommerceProxyRequest(
    ["tax", "rules"],
    "http://localhost:3002/api/platform-super-admin/commerce/tax/rules?country=IN&current_only=true",
    CHAT_API_BASE_URL,
  );
  assert.equal(rules.upstreamUrl, "https://chat.example.test/api/v1/tax/rules?country=IN&current_only=true");

  const exemptions = buildPlatformCommerceProxyRequest(
    ["tax", "exemptions"],
    "http://localhost:3002/api/platform-super-admin/commerce/tax/exemptions?status=pending&page=1&page_size=50",
    CHAT_API_BASE_URL,
  );
  assert.equal(exemptions.upstreamUrl, "https://chat.example.test/api/v1/tax/exemptions?status=pending&page=1&page_size=50");
  assert.equal(exemptions.init.method, "GET");
});

test("Tax Rule mutation routes are not part of the read-only BFF allowlist", async () => {
  const { isPlatformCommerceReadPath } = await getProxyHelpers();
  const ruleId = "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174";

  assert.equal(isPlatformCommerceReadPath(["tax", "rules"]), true);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", ruleId]), false);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", ruleId, "disable"]), false);
  assert.equal(isPlatformCommerceReadPath(["tax", "rules", ruleId, "versions"]), true);
});
