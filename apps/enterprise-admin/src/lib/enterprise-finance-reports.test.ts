import assert from "node:assert/strict";
import test from "node:test";

import { buildEnterpriseFinanceReportParams, enterpriseFinanceReportQueryKey, getEnterpriseReportFields, parseEnterpriseFinanceReport, parseEnterpriseFinanceReportForTenant } from "./enterprise-finance-reports.ts";

test("report request builders pass supported filters and omit tenant and export parameters", () => {
  assert.deepEqual(buildEnterpriseFinanceReportParams("payments", { date_from: "2026-01-01", status: "succeeded", currency: "INR" }, 2), {
    date_from: "2026-01-01", date_to: undefined, status: "succeeded", currency: "INR", page: 2, page_size: 25,
  });
  assert.deepEqual(buildEnterpriseFinanceReportParams("currency", { date_to: "2026-01-31" }), { date_from: undefined, date_to: "2026-01-31" });
  assert.deepEqual(buildEnterpriseFinanceReportParams("tax", { group_by: "country" }), { date_from: undefined, date_to: undefined, group_by: "country" });
  for (const category of ["payments", "refunds", "settlements", "currency", "tax"] as const) {
    const params = buildEnterpriseFinanceReportParams(category, { date_from: "2026-01-01" }, 1);
    assert.equal("tenant_id" in params, false);
    assert.equal("format" in params, false);
  }
});

test("report parsers retain backend decimal strings and distinguish valid zero results", () => {
  const payments = parseEnterpriseFinanceReport("payments", {
    base_currency: "INR", rows: [], total_rows: 0, page: 1, page_size: 25,
    totals: { paid_count: 0, base_collected: "0.00", amount: "12345678901234567890.123456" },
  });
  assert.equal(payments.total_rows, 0);
  assert.equal(payments.totals?.base_collected, "0.00");
  assert.equal(payments.totals?.amount, "12345678901234567890.123456");
  assert.equal(parseEnterpriseFinanceReport("currency", { base_currency: "INR", rows: [], totals: { INR: "0.00" } }).rows.length, 0);
  assert.equal(parseEnterpriseFinanceReport("tax", { group_by: "country", base_currency: "INR", rows: [], total_tax_base: "0.00" }).total_tax_base, "0.00");
});

test("malformed report response envelopes fail instead of becoming empty or zero totals", () => {
  assert.throws(() => parseEnterpriseFinanceReport("payments", { rows: [], total_rows: 0 }), /invalid paginated response/i);
  assert.throws(() => parseEnterpriseFinanceReport("currency", { rows: [] }), /invalid response/i);
  assert.throws(() => parseEnterpriseFinanceReport("tax", { base_currency: "INR", rows: [], total_tax_base: 0, group_by: "country" }), /invalid response/i);
});

test("report cache keys isolate accounts and both tenant and enterprise identities", () => {
  const key = enterpriseFinanceReportQueryKey("account-a", "tenant-a", "enterprise-a", "payments", { page: 1 });
  assert.notDeepEqual(key, enterpriseFinanceReportQueryKey("account-b", "tenant-a", "enterprise-a", "payments", { page: 1 }));
  assert.notDeepEqual(key, enterpriseFinanceReportQueryKey("account-a", "tenant-b", "enterprise-a", "payments", { page: 1 }));
  assert.notDeepEqual(key, enterpriseFinanceReportQueryKey("account-a", "tenant-a", "enterprise-b", "payments", { page: 1 }));
});

test("report response tenant IDs are checked when present and omitted IDs rely on backend scoping", () => {
  const valid = { base_currency: "INR", rows: [{ tenant_id: "tenant-a", amount: "10.00" }], total_rows: 1, page: 1, page_size: 25, totals: { tenant_id: "tenant-a", amount: "10.00" } };
  assert.equal(parseEnterpriseFinanceReportForTenant("payments", valid, "tenant-a").rows.length, 1);
  assert.throws(() => parseEnterpriseFinanceReportForTenant("payments", { ...valid, rows: [{ tenant_id: "tenant-b" }] }, "tenant-a"), /tenant scope/);
  assert.throws(() => parseEnterpriseFinanceReportForTenant("currency", { tenant_id: "tenant-b", base_currency: "INR", rows: [], totals: {} }, "tenant-a"), /tenant scope/);
  assert.equal(parseEnterpriseFinanceReportForTenant("currency", { base_currency: "INR", rows: [], totals: {} }, "tenant-a").rows.length, 0);
});

test("report row allowlists display relevant exact scalar values and exclude private fields", () => {
  const fields = getEnterpriseReportFields("tax", { country: "IN", tax_amount: "10.25", customer_name: "private", notes: "private" });
  assert.deepEqual(fields, [["country", "IN"], ["tax_amount", "10.25"]]);
  const payments = getEnterpriseReportFields("payments", { paid_count: 0, base_collected: "0.00", payment_id: "p-1", customer_email: "private" });
  assert.deepEqual(payments, [["paid_count", "0"], ["base_collected", "0.00"], ["payment_id", "p-1"]]);
});
