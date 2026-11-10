import assert from "node:assert/strict";
import test from "node:test";

test("reports cover all Phase 9 categories and mismatch types", async () => {
  const { defaultReportCategory, reconciliationMismatchTypes, reportCategories, reportCategoryDefinitions, reportCategoryLabels, reportEndpointPaths, reportQueryPolicy } = await import(new URL("./platform-reports.ts", import.meta.url).href);

  assert.equal(reportCategories.length, 8);
  assert.equal(defaultReportCategory, "payments");
  assert.deepEqual(reportQueryPolicy, { retry: false, staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: false });
  assert.deepEqual(reportEndpointPaths, {
    payments: ["/payment-reports/payments"],
    refunds: ["/payment-reports/refunds"],
    currencies: ["/payment-reports/currency"],
    tax: ["/tax/reports"],
    settlements: ["/payment-reports/settlements"],
    "exchange-rates": ["/payment-reports/exchange-rates"],
    reconciliation: ["/payment-reports/reconciliation", "/finance/reconciliation", "/finance/reconciliation/{run_id}"],
    "finance-audit": ["/finance/audit"],
  });
  assert.equal(reportCategoryLabels.reconciliation, "Reconciliation Reports");
  assert.equal(reportCategoryLabels["finance-audit"], "Finance Audit History");
  assert.deepEqual(reconciliationMismatchTypes, ["missing_internal", "missing_gateway", "amount_mismatch", "status_mismatch", "fee_mismatch", "currency_mismatch", "duplicate"]);
  assert.equal(reportCategoryDefinitions.payments.columns[1], "Payment status");
  assert.equal(reportCategoryDefinitions.tax.columns[3], "Tax collected");
  assert.equal(reportCategoryDefinitions["finance-audit"].columns[0], "Administrator");
});

test("report preview data is empty and does not fabricate financial totals", async () => {
  const { reportPreviewRows } = await import(new URL("./platform-reports.ts", import.meta.url).href);

  assert.equal(reportPreviewRows.length, 0);
});

test("report filter mapping sends only parameters supported by each endpoint", async () => {
  const { buildReportParams } = await import(new URL("./platform-reports.ts", import.meta.url).href);
  const filters = { date_from: "2026-10-01", date_to: "2026-10-31", tenant_id: "tenant", status: "processing", currency: "INR", quote: "USD", group_by: "tax_type", entity_type: "payment", entity_id: "id", action: "updated", actor_id: "actor" };
  assert.deepEqual(buildReportParams("payments", filters, 2, 25), { date_from: "2026-10-01", date_to: "2026-10-31", tenant_id: "tenant", status: "processing", currency: "INR", page: 2, page_size: 25 });
  assert.deepEqual(buildReportParams("refunds", filters, 3, 25), { date_from: "2026-10-01", date_to: "2026-10-31", tenant_id: "tenant", status: "processing", page: 3, page_size: 25 });
  assert.deepEqual(buildReportParams("settlements", filters, 1, 25), { date_from: "2026-10-01", date_to: "2026-10-31", tenant_id: "tenant", status: "processing", page: 1, page_size: 25 });
  assert.deepEqual(buildReportParams("currencies", filters), { date_from: "2026-10-01", date_to: "2026-10-31", tenant_id: "tenant" });
  assert.deepEqual(buildReportParams("exchange-rates", filters), { date_from: "2026-10-01", date_to: "2026-10-31", quote: "USD" });
  assert.deepEqual(buildReportParams("tax", filters), { date_from: "2026-10-01", date_to: "2026-10-31", tenant_id: "tenant", group_by: "tax_type" });
  assert.deepEqual(buildReportParams("finance-audit", filters, 1, 50), { date_from: "2026-10-01", date_to: "2026-10-31", tenant_id: "tenant", entity_type: "payment", entity_id: "id", action: "updated", actor_id: "actor", page: 1, page_size: 50 });
  assert.deepEqual(buildReportParams("reconciliation", filters), { date_from: "2026-10-01", date_to: "2026-10-31" });
});

test("generic report display preserves decimal strings and excludes sensitive fields", async () => {
  const { getSafeReportFields } = await import(new URL("./platform-reports.ts", import.meta.url).href);
  assert.deepEqual(getSafeReportFields({ amount: "100000000000000000.001", total_tax_base: "0.00", status: "processing", api_secret: "must-not-render", customer_email: "private@example.test", currency: "INR", nested: { private: true } }), [["amount", "100000000000000000.001"], ["total_tax_base", "0.00"], ["status", "processing"], ["currency", "INR"]]);
});

test("report HTTP error categories distinguish auth, permission, missing, invalid and unavailable", async () => {
  const { reportErrorKey } = await import(new URL("./platform-reports.ts", import.meta.url).href);
  assert.equal(reportErrorKey(401), "sessionExpired");
  assert.equal(reportErrorKey(403), "accessDenied");
  assert.equal(reportErrorKey(404), "notFound");
  assert.equal(reportErrorKey(422), "invalidRequest");
  assert.equal(reportErrorKey(503), "unavailable");
});
