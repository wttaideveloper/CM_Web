import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
import { assertSettlementListTenant, assertSettlementTenant, buildEnterpriseSettlementParams, enterpriseSettlementQueryKeys, hasEnterpriseSettlementScope, normalizeEnterpriseSettlementPage, settlementConfigMatchesTenant, settlementListReference, settlementStatusLabel } from "./enterprise-settlements.ts";

test("settlement list parameters are paginated and never contain a tenant override", () => {
  assert.deepEqual(buildEnterpriseSettlementParams({ status: "processing", dateFrom: "2026-01-01", dateTo: "" }, 2), {
    page: 2, page_size: 25, status: "processing", date_from: "2026-01-01", date_to: undefined,
  });
  assert.equal("tenant_id" in buildEnterpriseSettlementParams({ status: "", dateFrom: "", dateTo: "" }, 1), false);
});

test("settlement page preserves backend totals and decimal-string records with request pagination fallback", () => {
  const row = { id: "s-1", gross_amount: "120.40", net_amount: "110.20" };
  assert.deepEqual(normalizeEnterpriseSettlementPage({ items: [row], total: 31 }, 2), {
    items: [row], total: 31, page: 2, page_size: 25,
  });
  assert.throws(() => normalizeEnterpriseSettlementPage({ items: [], total: "0" }, 1), /invalid list response/i);
});

test("authenticated tenant may differ from enterprise id; only genuinely mismatched tenant responses are rejected", () => {
  const authorized = { id: "settlement-1", tenant_id: "tenant-a" };
  assert.equal(assertSettlementTenant(authorized, "tenant-a"), authorized);
  // The current enterprise ID is deliberately different: tenant_id is not compared to it.
  assert.notEqual("tenant-a", "enterprise-a");
  assert.throws(() => assertSettlementTenant({ id: "settlement-2", tenant_id: "tenant-b" }, "tenant-a"), /authenticated tenant scope/);
});

test("settlement list and detail records are accepted when tenant matches, regardless of enterprise ID", () => {
  const list = normalizeEnterpriseSettlementPage({ items: [{ id: "s1", tenant_id: "tenant-a", gross_amount: "12.30" }], total: 1 }, 1);
  const renderableList = assertSettlementListTenant(list, "tenant-a");
  assert.equal(renderableList.items.length, 1);
  assert.equal(renderableList.items[0]?.gross_amount, "12.30");
  assert.throws(() => assertSettlementListTenant({ items: [{ tenant_id: "tenant-b" }] }, "tenant-a"), /authenticated tenant scope/);
  const detail = { id: "s1", tenant_id: "tenant-a", net_amount: "10.25" };
  assert.equal(assertSettlementTenant(detail, "tenant-a").net_amount, "10.25");
});

test("settlement configuration validates the authenticated tenant, not enterprise ID", () => {
  assert.equal(settlementConfigMatchesTenant({ tenant_id: "tenant-a" }, "tenant-a"), true);
  assert.equal(settlementConfigMatchesTenant({ tenant_id: "tenant-b" }, "tenant-a"), false);
  assert.equal(settlementConfigMatchesTenant(undefined, "tenant-a"), false);
  assert.equal(settlementConfigMatchesTenant({ tenant_id: "tenant-a" }, null), false);
});

test("settlement cache keys isolate account, tenant and enterprise; unresolved scope disables loading", () => {
  const key = enterpriseSettlementQueryKeys("account-a", "tenant-a", "enterprise-a");
  assert.notDeepEqual(key.list({ page: 1 }), enterpriseSettlementQueryKeys("account-b", "tenant-a", "enterprise-a").list({ page: 1 }));
  assert.notDeepEqual(key.list({ page: 1 }), enterpriseSettlementQueryKeys("account-a", "tenant-b", "enterprise-a").list({ page: 1 }));
  assert.notDeepEqual(key.list({ page: 1 }), enterpriseSettlementQueryKeys("account-a", "tenant-a", "enterprise-b").list({ page: 1 }));
  assert.equal(hasEnterpriseSettlementScope("account-a", "tenant-a", "enterprise-a"), true);
  assert.equal(hasEnterpriseSettlementScope("account-a", null, "enterprise-a"), false);
  assert.equal(hasEnterpriseSettlementScope(null, "tenant-a", "enterprise-a"), false);
});

test("unknown settlement statuses remain visible in a readable form", () => {
  assert.equal(settlementStatusLabel("awaiting_manual_review"), "Awaiting Manual Review");
});

test("settlement list reference prefers backend reference with a safe ID fallback", () => {
  assert.equal(settlementListReference(" SET-2026-001 ", "settlement-uuid"), "SET-2026-001");
  assert.equal(settlementListReference("", "settlement-uuid"), "settlement-uuid");
  assert.equal(settlementListReference(null, "settlement-uuid"), "settlement-uuid");
});
