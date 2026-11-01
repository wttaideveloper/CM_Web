import assert from "node:assert/strict";
import test from "node:test";

test("reports cover all Phase 9 categories and mismatch types", async () => {
  const { reconciliationMismatchTypes, reportCategories, reportCategoryDefinitions, reportCategoryLabels } = await import(new URL("./platform-reports.ts", import.meta.url).href);

  assert.equal(reportCategories.length, 8);
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
