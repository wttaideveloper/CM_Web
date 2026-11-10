import assert from "node:assert/strict";
import test from "node:test";

import { buildEnterpriseCommerceUpstreamUrl, buildEnterprisePaymentUpstreamUrl, enterprisePaymentMethodNotAllowed, forwardEnterpriseCommerceRead, forwardEnterprisePaymentRead, isEnterpriseCommerceReadPath, isEnterprisePaymentReadPath } from "./enterprise-commerce-proxy.ts";

const PAYMENT_ID = "018f6b54-2a10-7cc4-8b7d-44c5f4b305a1";

test("allows only the three documented GET Payments paths and UUID IDs", () => {
  assert.equal(isEnterprisePaymentReadPath(["payments"]), true);
  assert.equal(isEnterprisePaymentReadPath(["payments", PAYMENT_ID]), true);
  assert.equal(isEnterprisePaymentReadPath(["payments", PAYMENT_ID, "transactions"]), true);
  assert.equal(isEnterprisePaymentReadPath(["payments", "not-a-uuid"]), false);
  assert.equal(isEnterprisePaymentReadPath(["payments", PAYMENT_ID, "transactions", "extra"]), false);
  assert.equal(isEnterprisePaymentReadPath(["refunds"]), false);
});

test("builds the configured API v1 destination and preserves list query parameters", () => {
  assert.equal(
    buildEnterprisePaymentUpstreamUrl(["payments"], "https://enterprise.test/api/enterprise-commerce/payments?page=2&page_size=25&status=processing", "https://chat.example/api/v1/"),
    "https://chat.example/api/v1/payments?page=2&page_size=25&status=processing",
  );
  assert.equal(
    buildEnterprisePaymentUpstreamUrl(["payments", PAYMENT_ID, "transactions"], `https://enterprise.test/api/enterprise-commerce/payments/${PAYMENT_ID}/transactions`, "https://chat.example"),
    `https://chat.example/api/v1/payments/${PAYMENT_ID}/transactions`,
  );
});

test("rejects tenant overrides, unknown filters, duplicate filters and invalid page values", () => {
  const base = "https://enterprise.test/api/enterprise-commerce/payments";
  assert.throws(() => buildEnterprisePaymentUpstreamUrl(["payments"], `${base}?tenant_id=other`, "https://chat.example"), /Tenant selection/);
  assert.throws(() => buildEnterprisePaymentUpstreamUrl(["payments"], `${base}?search=name`, "https://chat.example"), /Unsupported/);
  assert.throws(() => buildEnterprisePaymentUpstreamUrl(["payments"], `${base}?status=failed&status=succeeded`, "https://chat.example"), /Duplicate/);
  assert.throws(() => buildEnterprisePaymentUpstreamUrl(["payments"], `${base}?page=0`, "https://chat.example"), /pagination/);
});

test("forwards the HttpOnly Enterprise session token server-side and preserves upstream errors", async () => {
  let observedAuthorization: string | null = null;
  let observedUrl = "";
  const result = await forwardEnterprisePaymentRead({
    path: ["payments"],
    requestUrl: "https://enterprise.test/api/enterprise-commerce/payments?page=1&page_size=25",
    accessToken: "test-session-token",
    apiBaseUrl: "https://chat.example",
    fetcher: async (input, init) => {
      observedUrl = String(input);
      observedAuthorization = new Headers(init?.headers).get("Authorization");
      return new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(observedAuthorization, "Bearer test-session-token");
  assert.equal(observedUrl, "https://chat.example/api/v1/payments?page=1&page_size=25");
  assert.equal(result.response.status, 403);
  assert.equal(await result.response.text(), JSON.stringify({ detail: "Forbidden" }));
  assert.equal(result.response.headers.get("cache-control"), "private, no-store");
});

test("does not call upstream without an Enterprise session and returns no-store errors", async () => {
  let called = false;
  const result = await forwardEnterprisePaymentRead({
    path: ["payments"],
    requestUrl: "https://enterprise.test/api/enterprise-commerce/payments",
    accessToken: undefined,
    apiBaseUrl: "https://chat.example",
    fetcher: async () => { called = true; return new Response(null); },
  });
  assert.equal(called, false);
  assert.equal(result.response.status, 401);
  assert.equal(result.response.headers.get("cache-control"), "private, no-store");
});

test("financial mutations and unsupported methods are rejected", async () => {
  assert.equal(enterprisePaymentMethodNotAllowed().status, 405);
  const result = await forwardEnterprisePaymentRead({
    path: ["payments", PAYMENT_ID, "refund"],
    requestUrl: "https://enterprise.test/api/enterprise-commerce/payments",
    accessToken: "session",
    apiBaseUrl: "https://chat.example",
  });
  assert.equal(result.response.status, 404);
});

test("Enterprise Commerce BFF allows only documented Refund and Invoice GET paths with UUID details", () => {
  const allowed = [
    ["refunds"], ["refunds", PAYMENT_ID], ["invoices"], ["invoices", PAYMENT_ID],
    ["invoices", PAYMENT_ID, "download"], ["invoices", "templates"],
  ];
  for (const path of allowed) assert.equal(isEnterpriseCommerceReadPath(path), true, path.join("/"));
  for (const path of [
    ["refunds", "not-a-uuid"], ["refunds", PAYMENT_ID, "decision"], ["invoices", "bad-id"],
    ["invoices", PAYMENT_ID, "email"], ["invoices", "templates", "save"], ["payments", PAYMENT_ID, "refund"],
  ]) assert.equal(isEnterpriseCommerceReadPath(path), false, path.join("/"));
});

test("Enterprise settlements allow only list, UUID detail and configuration GET paths", () => {
  for (const path of [["settlements"], ["settlements", PAYMENT_ID], ["settlements", "config"]]) {
    assert.equal(isEnterpriseCommerceReadPath(path), true, path.join("/"));
  }
  for (const path of [
    ["settlements", "bad-id"], ["settlements", PAYMENT_ID, "verify"], ["settlements", PAYMENT_ID, "export"],
    ["settlements", "config", "extra"], ["settlements", PAYMENT_ID, "cancel"],
  ]) assert.equal(isEnterpriseCommerceReadPath(path), false, path.join("/"));
});

test("settlement list forwards only page, page_size, status and date filters; tenant overrides are rejected", () => {
  const base = "https://enterprise.test/api/enterprise-commerce";
  assert.equal(
    buildEnterpriseCommerceUpstreamUrl(["settlements"], `${base}/settlements?page=2&page_size=25&status=completed&date_from=2026-01-01&date_to=2026-01-31`, "https://chat.example"),
    "https://chat.example/api/v1/settlements?page=2&page_size=25&status=completed&date_from=2026-01-01&date_to=2026-01-31",
  );
  for (const [path, query] of [
    [["settlements"], "tenant_id=other"], [["settlements"], "cursor=opaque"], [["settlements"], "page=0"],
    [["settlements", "config"], "tenant_id=other"], [["settlements", PAYMENT_ID], "status=completed"],
  ] as const) assert.throws(() => buildEnterpriseCommerceUpstreamUrl(path, `${base}/${path.join("/")}?${query}`, "https://chat.example"));
});

test("settlement BFF forwards the Enterprise session server-side and preserves upstream status", async () => {
  let observedAuthorization: string | null = null;
  let observedUrl = "";
  const result = await forwardEnterpriseCommerceRead({
    path: ["settlements", "config"], requestUrl: "https://enterprise.test/api/enterprise-commerce/settlements/config",
    accessToken: "enterprise-session-token", apiBaseUrl: "https://chat.example",
    fetcher: async (input, init) => {
      observedUrl = String(input);
      observedAuthorization = new Headers(init?.headers).get("Authorization");
      return new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(observedAuthorization, "Bearer enterprise-session-token");
  assert.equal(observedUrl, "https://chat.example/api/v1/settlements/config");
  assert.equal(result.response.status, 403);
  assert.equal(result.response.headers.get("cache-control"), "private, no-store");
});

test("Enterprise BFF allows only the five merchant reporting resources", () => {
  for (const path of [["payment-reports", "payments"], ["payment-reports", "refunds"], ["payment-reports", "settlements"], ["payment-reports", "currency"], ["tax", "reports"]]) {
    assert.equal(isEnterpriseCommerceReadPath(path), true, path.join("/"));
  }
  for (const path of [
    ["payment-reports", "overview"], ["payment-reports", "exchange-rates"], ["payment-reports", "reconciliation"],
    ["finance", "audit"], ["finance", "reconciliation"], ["tax", "rules"], ["payment-reports", "payments", "export"],
  ]) assert.equal(isEnterpriseCommerceReadPath(path), false, path.join("/"));
});

test("merchant tax profile remains GET-only and rejects tenant selection", () => {
  const base = "https://enterprise.test/api/enterprise-commerce";
  assert.equal(isEnterpriseCommerceReadPath(["tax", "merchant-profile"]), true);
  assert.equal(buildEnterpriseCommerceUpstreamUrl(["tax", "merchant-profile"], `${base}/tax/merchant-profile`, "https://chat.example"), "https://chat.example/api/v1/tax/merchant-profile");
  assert.throws(() => buildEnterpriseCommerceUpstreamUrl(["tax", "merchant-profile"], `${base}/tax/merchant-profile?tenant_id=other`, "https://chat.example"), /Tenant selection/);
  assert.equal(enterprisePaymentMethodNotAllowed().status, 405);
});

test("Enterprise report routes reject tenant overrides, CSV mode and unsupported filters", () => {
  const base = "https://enterprise.test/api/enterprise-commerce";
  assert.equal(
    buildEnterpriseCommerceUpstreamUrl(["payment-reports", "payments"], `${base}/payment-reports/payments?date_from=2026-01-01&date_to=2026-01-31&status=succeeded&currency=INR&page=2&page_size=25`, "https://chat.example"),
    "https://chat.example/api/v1/payment-reports/payments?date_from=2026-01-01&date_to=2026-01-31&status=succeeded&currency=INR&page=2&page_size=25",
  );
  assert.equal(buildEnterpriseCommerceUpstreamUrl(["payment-reports", "refunds"], `${base}/payment-reports/refunds?status=completed&page=1&page_size=25`, "https://chat.example"), "https://chat.example/api/v1/payment-reports/refunds?status=completed&page=1&page_size=25");
  assert.equal(buildEnterpriseCommerceUpstreamUrl(["payment-reports", "settlements"], `${base}/payment-reports/settlements?date_from=2026-01-01&page=1&page_size=25`, "https://chat.example"), "https://chat.example/api/v1/payment-reports/settlements?date_from=2026-01-01&page=1&page_size=25");
  assert.equal(buildEnterpriseCommerceUpstreamUrl(["payment-reports", "currency"], `${base}/payment-reports/currency?date_from=2026-01-01`, "https://chat.example"), "https://chat.example/api/v1/payment-reports/currency?date_from=2026-01-01");
  assert.equal(buildEnterpriseCommerceUpstreamUrl(["tax", "reports"], `${base}/tax/reports?date_to=2026-01-31&group_by=country`, "https://chat.example"), "https://chat.example/api/v1/tax/reports?date_to=2026-01-31&group_by=country");
  for (const [path, query] of [
    [["payment-reports", "payments"], "tenant_id=other"], [["payment-reports", "refunds"], "format=csv"],
    [["payment-reports", "settlements"], "cursor=opaque"], [["payment-reports", "currency"], "page=1"],
    [["tax", "reports"], "group_by=tenant_id"], [["tax", "reports"], "tenant_id=other"],
  ] as const) assert.throws(() => buildEnterpriseCommerceUpstreamUrl(path, `${base}/${path.join("/")}?${query}`, "https://chat.example"));
});

test("merchant report forwarding uses the Enterprise session and preserves authorization errors", async () => {
  let authorization: string | null = null;
  const result = await forwardEnterpriseCommerceRead({
    path: ["tax", "reports"], requestUrl: "https://enterprise.test/api/enterprise-commerce/tax/reports?group_by=country",
    accessToken: "enterprise-session-token", apiBaseUrl: "https://chat.example",
    fetcher: async (_input, init) => {
      authorization = new Headers(init?.headers).get("Authorization");
      return new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(authorization, "Bearer enterprise-session-token");
  assert.equal(result.response.status, 403);
  assert.equal(result.response.headers.get("cache-control"), "private, no-store");
});

test("Enterprise Refund and Invoice BFF preserves supported pagination/filter query strings and rejects tenant overrides", () => {
  const base = "https://enterprise.test/api/enterprise-commerce";
  assert.equal(
    buildEnterpriseCommerceUpstreamUrl(["refunds"], `${base}/refunds?page=2&page_size=25&status=processing&payment_id=${PAYMENT_ID}&overdue=false&date_from=2026-01-01`, "https://chat.example/api/v1"),
    `https://chat.example/api/v1/refunds?page=2&page_size=25&status=processing&payment_id=${PAYMENT_ID}&overdue=false&date_from=2026-01-01`,
  );
  assert.equal(
    buildEnterpriseCommerceUpstreamUrl(["invoices"], `${base}/invoices?page=1&page_size=25&doc_type=invoice&search=INV-1&payment_id=${PAYMENT_ID}`, "https://chat.example"),
    `https://chat.example/api/v1/invoices?page=1&page_size=25&doc_type=invoice&search=INV-1&payment_id=${PAYMENT_ID}`,
  );
  for (const path of [["refunds"], ["invoices"]]) {
    assert.throws(() => buildEnterpriseCommerceUpstreamUrl(path, `${base}/${path[0]}?tenant_id=other`, "https://chat.example"), /Tenant selection/);
    assert.throws(() => buildEnterpriseCommerceUpstreamUrl(path, `${base}/${path[0]}?unsupported=x`, "https://chat.example"), /Unsupported/);
    assert.throws(() => buildEnterpriseCommerceUpstreamUrl(path, `${base}/${path[0]}?page=0`, "https://chat.example"), /pagination/);
    assert.throws(() => buildEnterpriseCommerceUpstreamUrl(path, `${base}/${path[0]}?page=1&page=2`, "https://chat.example"), /Duplicate/);
  }
  assert.throws(() => buildEnterpriseCommerceUpstreamUrl(["invoices", PAYMENT_ID], `${base}/invoices/${PAYMENT_ID}?payment_id=x`, "https://chat.example"), /Unsupported/);
  assert.throws(() => buildEnterpriseCommerceUpstreamUrl(["invoices", "templates"], `${base}/invoices/templates?tenant_id=x`, "https://chat.example"), /Tenant selection/);
});

test("Enterprise Commerce BFF forwards server token and preserves backend authorization errors", async () => {
  let observedAuthorization: string | null = null;
  const result = await forwardEnterpriseCommerceRead({
    path: ["refunds"],
    requestUrl: `https://enterprise.test/api/enterprise-commerce/refunds?page=1&page_size=25`,
    accessToken: "enterprise-session-token",
    apiBaseUrl: "https://chat.example",
    fetcher: async (_input, init) => {
      observedAuthorization = new Headers(init?.headers).get("Authorization");
      return new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403, headers: { "content-type": "application/problem+json", "x-request-id": "req-1" } });
    },
  });
  assert.equal(observedAuthorization, "Bearer enterprise-session-token");
  assert.equal(result.response.status, 403);
  assert.equal(result.response.headers.get("cache-control"), "private, no-store");
  assert.equal(result.response.headers.get("x-request-id"), "req-1");
  assert.equal(await result.response.text(), JSON.stringify({ detail: "Forbidden" }));
});

test("Enterprise invoice PDF route validates content type and uses safe no-store attachment headers", async () => {
  const url = `https://enterprise.test/api/enterprise-commerce/invoices/${PAYMENT_ID}/download`;
  let accept = "";
  const successful = await forwardEnterpriseCommerceRead({
    path: ["invoices", PAYMENT_ID, "download"], requestUrl: url, accessToken: "session", apiBaseUrl: "https://chat.example",
    fetcher: async (_input, init) => { accept = new Headers(init?.headers).get("Accept") ?? ""; return new Response("pdf", { status: 200, headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=unsafe.pdf", "set-cookie": "secret=hidden" } }); },
  });
  assert.equal(accept, "application/pdf");
  assert.equal(successful.response.status, 200);
  assert.equal(successful.response.headers.get("content-disposition"), `attachment; filename="invoice-${PAYMENT_ID}.pdf"`);
  assert.equal(successful.response.headers.get("cache-control"), "private, no-store");
  assert.equal(successful.response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(successful.response.headers.get("set-cookie"), null);

  const invalidPdf = await forwardEnterpriseCommerceRead({
    path: ["invoices", PAYMENT_ID, "download"], requestUrl: url, accessToken: "session", apiBaseUrl: "https://chat.example",
    fetcher: async () => new Response("not pdf", { status: 200, headers: { "content-type": "application/json" } }),
  });
  assert.equal(invalidPdf.response.status, 502);
  assert.match(await invalidPdf.response.text(), /did not return a PDF/);
});

test("Enterprise Commerce read BFF rejects missing sessions, unsupported paths and non-GET methods", async () => {
  let called = false;
  const noSession = await forwardEnterpriseCommerceRead({ path: ["invoices"], requestUrl: "https://enterprise.test/api/enterprise-commerce/invoices", accessToken: undefined, apiBaseUrl: "https://chat.example", fetcher: async () => { called = true; return new Response(); } });
  const unsupported = await forwardEnterpriseCommerceRead({ path: ["refunds", PAYMENT_ID, "decision"], requestUrl: "https://enterprise.test/api/enterprise-commerce/refunds", accessToken: "session", apiBaseUrl: "https://chat.example", fetcher: async () => { called = true; return new Response(); } });
  assert.equal(noSession.response.status, 401);
  assert.equal(unsupported.response.status, 404);
  assert.equal(enterprisePaymentMethodNotAllowed().status, 405);
  assert.equal(called, false);
});
