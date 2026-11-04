import assert from "node:assert/strict";
import test from "node:test";

async function helpers() {
  return import(new URL("./platform-settlements-live.ts", import.meta.url).href);
}

test("settlement list params include only declared filters and requested pagination", async () => {
  const { buildSettlementListParams } = await helpers();
  assert.deepEqual(buildSettlementListParams({ tenantId: " tenant-1 ", status: "completed", from: "2026-01-01", to: "2026-01-31" }, 2, 25), {
    tenant_id: "tenant-1", status: "completed", date_from: "2026-01-01", date_to: "2026-01-31", page: 2, page_size: 25,
  });
  assert.deepEqual(buildSettlementListParams({ tenantId: "", status: "", from: "", to: "" }, 1, 25), { tenant_id: undefined, status: undefined, date_from: undefined, date_to: undefined, page: 1, page_size: 25 });
});

test("settlement pagination preserves total and falls back when page metadata is omitted", async () => {
  const { getSettlementPagination } = await helpers();
  const exactResponseShape = { items: [], total: 1916 };
  assert.deepEqual(getSettlementPagination(exactResponseShape, 3, 25), { page: 3, pageSize: 25, total: 1916, pageCount: 77 });
  assert.deepEqual(getSettlementPagination({ ...exactResponseShape, page: 2, page_size: 50 }, 3, 25), { page: 2, pageSize: 50, total: 1916, pageCount: 39 });
  assert.deepEqual(getSettlementPagination({ items: [], total: 0 }, 1, 25), { page: 1, pageSize: 25, total: 0, pageCount: 1 });
});

test("settlement amount fields preserve backend decimal strings exactly", async () => {
  const { getSettlementAmountFields } = await helpers();
  const values = getSettlementAmountFields({
    id: "s-1", reference: "ref-1", tenant_id: "tenant-1", status: "processing", period_start: "2026-01-01", period_end: "2026-01-07", currency: "INR", base_currency: "INR", exchange_rate: "1.000000", gross_amount: "123456789012345678.90", refund_amount: "0.00", commission_amount: "2.50", fee_amount: "1.00", fixed_fee_amount: "0.25", tax_collected: "0.00", net_amount: "123456789012345675.15", items_count: 0, created_at: "2026-01-08T00:00:00Z",
  });
  assert.deepEqual(values, { gross: "123456789012345678.90", refunds: "0.00", commission: "2.50", gatewayFees: "1.00", fixedFees: "0.25", net: "123456789012345675.15" });
});

test("configuration requires an explicit valid tenant identifier", async () => {
  const { isSettlementTenantId, settlementConfigMatchesTenant } = await helpers();
  assert.equal(isSettlementTenantId("46fcd847-ee32-4f75-bbc8-a3cbb9d6a174"), true);
  assert.equal(isSettlementTenantId(""), false);
  assert.equal(isSettlementTenantId("platform-wide"), false);
  const config = { tenant_id: "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174" } as never;
  assert.equal(settlementConfigMatchesTenant(config, "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174"), true);
  assert.equal(settlementConfigMatchesTenant(config, "3d64e22c-7a3c-4e71-bc3f-42e96dbdb1d2"), false);
});

test("arbitrary payout account values are never exposed in UI", async () => {
  const { getPayoutAccountDisplay, settlementErrorKey } = await helpers();
  assert.equal(getPayoutAccountDisplay({ payout_account: { account_number: "sensitive", masked_number: "****1234" } } as never), "withheld");
  assert.equal(getPayoutAccountDisplay({ payout_account: null } as never), "notSupplied");
  assert.equal(settlementErrorKey(401), "sessionExpired");
  assert.equal(settlementErrorKey(403), "accessDenied");
  assert.equal(settlementErrorKey(404), "resourceNotFound");
  assert.equal(settlementErrorKey(422), "invalidRequest");
  assert.equal(settlementErrorKey(undefined), "dataUnavailable");
});
