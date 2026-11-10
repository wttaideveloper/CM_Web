import assert from "node:assert/strict";
import test from "node:test";

async function getOverviewHelpers() {
  return import(new URL("./platform-commerce-overview.ts", import.meta.url).href);
}

test("overview query construction sends only supported date and tenant filters", async () => {
  const { buildOverviewQueryParams } = await getOverviewHelpers();
  assert.deepEqual(buildOverviewQueryParams({ from: "2026-01-01", to: "2026-01-31", enterprise: " tenant-7 " }), {
    date_from: "2026-01-01",
    date_to: "2026-01-31",
    tenant_id: "tenant-7",
  });
  assert.deepEqual(buildOverviewQueryParams({ from: "", to: "", enterprise: "" }), {});
});

test("overview mapping uses the live aggregate fields and preserves zeroes", async () => {
  const { formatMetricValue, getOverviewMetric } = await getOverviewHelpers();
  const overview = {
    base_currency: "INR",
    period: {},
    payments: { paid: 0, waiting: 0, failed: 0, by_status: { succeeded: 0, processing: 0 }, base_collected: "0.00" },
    refunds: { total: 0 },
    tax: { base_collected: "0.00" },
    settlements: { pending: 0 },
    needs_attention: [],
  } as never;

  assert.equal(formatMetricValue(getOverviewMetric(overview, "payments", "paid")), "0");
  assert.equal(formatMetricValue(getOverviewMetric(overview, "payments", "waiting")), "0");
  assert.equal(formatMetricValue(getOverviewMetric(overview, "payments", "failed")), "0");
  assert.equal(formatMetricValue(getOverviewMetric(overview, "refunds", "total")), "0");
  assert.equal(formatMetricValue(getOverviewMetric(overview, "settlements", "pending")), "0");
  assert.equal(formatMetricValue(getOverviewMetric(overview, "tax", "base_collected")), "0.00");
});

test("needs-attention mapping displays all live counts, including zeroes", async () => {
  const { getNeedsAttentionMetrics } = await getOverviewHelpers();
  const metrics = getNeedsAttentionMetrics({
    payments_under_review: 0,
    payments_needing_reconciliation: 1,
    refunds_overdue: 0,
    refunds_failed: 0,
    settlements_failed: 0,
    settlements_on_hold: 2,
    open_reconciliation_mismatches: 0,
  });

  assert.equal(metrics.length, 7);
  assert.deepEqual(metrics.map((metric: { value: string }) => metric.value), ["0", "1", "0", "0", "0", "2", "0"]);
});

test("overview mapping does not invent missing metrics", async () => {
  const { formatMetricValue, getOverviewMetric } = await getOverviewHelpers();
  const overview = {
    base_currency: "INR",
    period: {},
    payments: {},
    refunds: {},
    tax: {},
    settlements: {},
    needs_attention: {},
  } as never;

  assert.equal(formatMetricValue(getOverviewMetric(overview, "payments", "paid")), "Not supplied");
});
