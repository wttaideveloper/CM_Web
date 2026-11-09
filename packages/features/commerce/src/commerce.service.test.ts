import assert from "node:assert/strict";
import test from "node:test";
import { CommerceApiError, readCommerceResponse } from "./commerce-response.ts";
import { buildCommerceUrl, commercePathSegment } from "./commerce-url.ts";

test("buildCommerceUrl serializes documented filters and omits null values", () => {
  assert.equal(
    buildCommerceUrl("/payments", {
      status: "succeeded",
      currency: "INR",
      tenant_id: null,
      page: 2,
      page_size: 20,
    }),
    "/api/v1/payments?status=succeeded&currency=INR&page=2&page_size=20",
  );
});
test("buildCommerceUrl supports report and history paths", () => {
  assert.equal(
    buildCommerceUrl("payment-reports/overview", { date_from: "2026-01-01" }),
    "/api/v1/payment-reports/overview?date_from=2026-01-01",
  );
  assert.equal(
    buildCommerceUrl("/currencies/rates/history", { quote: "USD", page: 1 }),
    "/api/v1/currencies/rates/history?quote=USD&page=1",
  );
  assert.equal(
    buildCommerceUrl("/payments", { page: 1, page_size: 25 }, "/api/platform-super-admin/commerce"),
    "/api/platform-super-admin/commerce/payments?page=1&page_size=25",
  );
});
test("buildCommerceUrl supports all read-only tax routes and deployed filters", () => {
  assert.equal(buildCommerceUrl("/tax/rules", { country: "IN", tax_type: "GST", current_only: false }, "/api/platform-super-admin/commerce"), "/api/platform-super-admin/commerce/tax/rules?country=IN&tax_type=GST&current_only=false");
  assert.equal(buildCommerceUrl("/tax/rules/46fcd847-ee32-4f75-bbc8-a3cbb9d6a174/versions", undefined, "/api/platform-super-admin/commerce"), "/api/platform-super-admin/commerce/tax/rules/46fcd847-ee32-4f75-bbc8-a3cbb9d6a174/versions");
  assert.equal(buildCommerceUrl("/tax/history", { country: "IN", date_from: "2026-01-01T00:00:00Z", page: 2, page_size: 50 }, "/api/platform-super-admin/commerce"), "/api/platform-super-admin/commerce/tax/history?country=IN&date_from=2026-01-01T00%3A00%3A00Z&page=2&page_size=50");
  assert.equal(buildCommerceUrl("/tax/exemptions", { status: "pending", page: 2, page_size: 50 }, "/api/platform-super-admin/commerce"), "/api/platform-super-admin/commerce/tax/exemptions?status=pending&page=2&page_size=50");
});

test("merchant profile resolves to the Enterprise BFF without a tenant override", () => {
  assert.equal(buildCommerceUrl("/tax/merchant-profile", undefined, "/api/enterprise-commerce"), "/api/enterprise-commerce/tax/merchant-profile");
});

test("report URLs preserve supported filters and response amounts remain exact strings", async () => {
  const base = "/api/platform-super-admin/commerce";
  assert.equal(buildCommerceUrl("/payment-reports/payments", { date_from: "2026-10-01", status: "future_status", page: 1, page_size: 25 }, base), "/api/platform-super-admin/commerce/payment-reports/payments?date_from=2026-10-01&status=future_status&page=1&page_size=25");
  assert.equal(buildCommerceUrl("/tax/reports", { date_from: "2026-10-01", group_by: "tax_type" }, base), "/api/platform-super-admin/commerce/tax/reports?date_from=2026-10-01&group_by=tax_type");
  const response = await readCommerceResponse<{ rows: readonly { amount: string; status: string }[] }>(new Response(JSON.stringify({ rows: [{ amount: "9007199254740993.01", status: "future_status" }] }), { status: 200 }));
  assert.equal(response.rows[0]?.amount, "9007199254740993.01");
  assert.equal(response.rows[0]?.status, "future_status");
});

test("all report resources resolve to the corresponding authenticated BFF paths", () => {
  const base = "/api/platform-super-admin/commerce";
  const paths = [
    "/payment-reports/payments", "/payment-reports/refunds", "/payment-reports/currency",
    "/tax/reports", "/payment-reports/settlements", "/payment-reports/exchange-rates",
    "/payment-reports/reconciliation", "/finance/reconciliation", "/finance/audit",
  ];
  for (const path of paths) assert.equal(buildCommerceUrl(path, {}, base), `${base}${path}`);
  assert.equal(buildCommerceUrl("/finance/reconciliation/46fcd847-ee32-4f75-bbc8-a3cbb9d6a174", {}, base), `${base}/finance/reconciliation/46fcd847-ee32-4f75-bbc8-a3cbb9d6a174`);
});

test("buildCommerceUrl supports authenticated Super Admin refund list and detail paths", () => {
  const base = "/api/platform-super-admin/commerce";
  assert.equal(
    buildCommerceUrl("/refunds", { status: "processing", payment_id: "refund-payment", tenant_id: "enterprise-id", overdue: false, date_from: "2026-10-01T00:00:00.000Z", page: 2, page_size: 20 }, base),
    "/api/platform-super-admin/commerce/refunds?status=processing&payment_id=refund-payment&tenant_id=enterprise-id&overdue=false&date_from=2026-10-01T00%3A00%3A00.000Z&page=2&page_size=20",
  );
  assert.equal(buildCommerceUrl("/refunds/46fcd847-ee32-4f75-bbc8-a3cbb9d6a174", undefined, base), "/api/platform-super-admin/commerce/refunds/46fcd847-ee32-4f75-bbc8-a3cbb9d6a174");
});

test("buildCommerceUrl supports invoice list, detail, template and binary download paths", () => {
  const base = "/api/platform-super-admin/commerce";
  const id = "0192ac34-1234-7abc-8def-0123456789ab";
  assert.equal(buildCommerceUrl("/invoices", { doc_type: "credit_note", search: "INV-10", tenant_id: "tenant-id", page: 2, page_size: 20 }, base), "/api/platform-super-admin/commerce/invoices?doc_type=credit_note&search=INV-10&tenant_id=tenant-id&page=2&page_size=20");
  assert.equal(buildCommerceUrl(`/invoices/${id}`, undefined, base), `/api/platform-super-admin/commerce/invoices/${id}`);
  assert.equal(buildCommerceUrl("/invoices/templates", {}, base), "/api/platform-super-admin/commerce/invoices/templates");
  assert.equal(buildCommerceUrl(`/invoices/${id}/download`, undefined, base), `/api/platform-super-admin/commerce/invoices/${id}/download`);
});

test("commercePathSegment encodes identifiers and rejects blank values", () => {
  assert.equal(commercePathSegment("payment/id", "paymentId"), "payment%2Fid");
  assert.throws(() => commercePathSegment("  ", "paymentId"), /paymentId is required/);
});

test("readCommerceResponse preserves financial decimal strings", async () => {
  const response = new Response(JSON.stringify({ total_amount: "100.10" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  const body = await readCommerceResponse<{ total_amount: string }>(response);
  assert.equal(body.total_amount, "100.10");
});

test("readCommerceResponse preserves refund decimal amounts and unknown statuses", async () => {
  const response = new Response(JSON.stringify({ amount: "0.10", tax_refunded: "0.00", status: "future_state" }), { status: 200 });
  const body = await readCommerceResponse<{ amount: string; tax_refunded: string; status: string }>(response);
  assert.equal(body.amount, "0.10");
  assert.equal(body.tax_refunded, "0.00");
  assert.equal(body.status, "future_state");
});

test("readCommerceResponse preserves deployed refund list/detail fields", async () => {
  const refund = {
    id: "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174",
    payment_id: "eac2fe19-4e62-4a26-97c5-9a4633c7d853",
    status: "future_state",
    status_label: "Future state",
    refund_type: "partial",
    amount: "0.10",
    currency: "INR",
    destination: "original",
    tax_refunded: "0.00",
    created_at: "2026-10-29T09:00:00",
    actions: ["new_backend_action"],
  };
  const body = await readCommerceResponse<typeof refund>(new Response(JSON.stringify(refund), { status: 200 }));
  assert.deepEqual(body, refund);
});

test("readCommerceResponse preserves invoice snapshots, unknown status and optional fields", async () => {
  const invoice = {
    id: "0192ac34-1234-7abc-8def-0123456789ab",
    doc_type: "invoice",
    number: "INV-2026-10",
    status: "future_state",
    payment_id: "eac2fe19-4e62-4a26-97c5-9a4633c7d853",
    currency: "INR",
    item_currency: "USD",
    exchange_rate: "83.125000",
    base_currency: "INR",
    base_rate: "1.000000",
    base_total: "831.25",
    subtotal: "800.00",
    tax_total: "31.25",
    total: "831.25",
    issued_at: "2026-10-29T09:00:00",
  };
  const body = await readCommerceResponse<typeof invoice>(new Response(JSON.stringify(invoice), { status: 200 }));
  assert.equal(body.total, "831.25");
  assert.equal(body.exchange_rate, "83.125000");
  assert.equal(body.status, "future_state");
  assert.equal("lines" in body, false);
});

test("readCommerceResponse preserves paginated invoice items without changing decimal strings", async () => {
  const list = { items: [{ id: "invoice-id", number: "INV-1", total: "0.10", currency: "INR", status: "issued" }], total: 1, page: 1, page_size: 20 };
  const body = await readCommerceResponse<typeof list>(new Response(JSON.stringify(list), { status: 200 }));
  assert.deepEqual(body, list);
  assert.equal(body.items[0]?.total, "0.10");
});

test("readCommerceResponse preserves the single read-only invoice template response", async () => {
  const template = { is_default: true, display_name: "Platform default", locale: "en", show_exchange_rate: false };
  const body = await readCommerceResponse<typeof template>(new Response(JSON.stringify(template), { status: 200 }));
  assert.deepEqual(body, template);
  assert.equal("items" in body, false);
});

test("readCommerceResponse preserves backend status and safe detail", async () => {
  const response = new Response(JSON.stringify({ detail: "Forbidden by tenant policy" }), { status: 403 });
  await assert.rejects(
    readCommerceResponse(response),
    (error: unknown) => error instanceof CommerceApiError
      && error.status === 403
      && error.message === "Forbidden by tenant policy",
  );
});

test("readCommerceResponse rejects a successful non-JSON response", async () => {
  const response = new Response("not-json", { status: 200 });
  await assert.rejects(
    readCommerceResponse(response),
    (error: unknown) => error instanceof CommerceApiError
      && error.status === 502,
  );
});
