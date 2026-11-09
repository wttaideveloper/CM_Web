import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
import { assertEnterprisePaymentListTenant, assertEnterprisePaymentTenant, buildEnterprisePaymentParams, enterprisePaymentPageCount, enterprisePaymentQueryKeys, enterprisePaymentStatusLabel, formatEnterprisePaymentAmount, hasEnterprisePaymentScope, normalizeEnterprisePaymentList, redactGatewayHistory } from "./enterprise-payments.ts";
// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
import { buildCommerceUrl } from "../../../../packages/features/commerce/src/commerce-url.ts";

test("builds page-based list filters without a client-controlled tenant", () => {
  assert.deepEqual(buildEnterprisePaymentParams({ status: "processing", currency: " inr ", purchaseType: "product", dateFrom: "2026-10-01", dateTo: "2026-10-31" }, 3), {
    page: 3, page_size: 25, status: "processing", currency: "INR", purchase_type: "product", date_from: "2026-10-01", date_to: "2026-10-31",
  });
  assert.equal("tenant_id" in buildEnterprisePaymentParams({ status: "", currency: "", purchaseType: "", dateFrom: "", dateTo: "" }, 1), false);
});

test("payment query keys are isolated by account, tenant and enterprise", () => {
  const first = enterprisePaymentQueryKeys("account-a", "tenant-a", "enterprise-a");
  const otherAccount = enterprisePaymentQueryKeys("account-b", "tenant-a", "enterprise-a");
  const otherTenant = enterprisePaymentQueryKeys("account-a", "tenant-b", "enterprise-a");
  const otherEnterprise = enterprisePaymentQueryKeys("account-a", "tenant-a", "enterprise-b");
  assert.notDeepEqual(first.detail("payment-id"), otherAccount.detail("payment-id"));
  assert.notDeepEqual(first.detail("payment-id"), otherTenant.detail("payment-id"));
  assert.notDeepEqual(first.history("payment-id"), otherEnterprise.history("payment-id"));
  assert.equal(hasEnterprisePaymentScope("account-a", "tenant-a", "enterprise-a"), true);
  assert.equal(hasEnterprisePaymentScope("account-a", null, "enterprise-a"), false);
  assert.equal(hasEnterprisePaymentScope("account-a", "tenant-a", null), false);
});

test("payments accept the authenticated tenant even when enterprise id differs and reject mismatches", () => {
  const payment = { id: "p-1", tenant_id: "tenant-a", amount: "12.30" };
  assert.equal(assertEnterprisePaymentTenant(payment, "tenant-a"), payment);
  assert.notEqual("tenant-a", "enterprise-a");
  assert.throws(() => assertEnterprisePaymentTenant({ ...payment, tenant_id: "tenant-b" }, "tenant-a"), /authenticated tenant scope/);
  assert.throws(() => assertEnterprisePaymentListTenant({ items: [payment, { ...payment, tenant_id: "tenant-b" }] }, "tenant-a"), /authenticated tenant scope/);
  const legacyPayment = { id: "legacy-payment", tenant_id: undefined };
  assert.equal(assertEnterprisePaymentTenant(legacyPayment, "tenant-a").id, "legacy-payment");
});

test("preserves unknown statuses and exact decimal strings", () => {
  assert.equal(enterprisePaymentStatusLabel("future_state"), "Future State");
  assert.equal(enterprisePaymentStatusLabel("processing"), "Processing");
  assert.equal(formatEnterprisePaymentAmount("9007199254740993.01", "INR"), "9007199254740993.01 INR");
});

test("calculates display pagination without NaN and retains a page for empty results", () => {
  assert.equal(enterprisePaymentPageCount(0), 1);
  assert.equal(enterprisePaymentPageCount(51), 3);
});

test("normalizes page-based collection envelopes and rejects false empty results", () => {
  assert.deepEqual(normalizeEnterprisePaymentList({ items: [], total: 0 }, 2, 25), { items: [], total: 0, page: 2, page_size: 25 });
  assert.throws(() => normalizeEnterprisePaymentList({ items: [] }, 1, 25), /invalid list response/);
  assert.throws(() => normalizeEnterprisePaymentList({ items: [], total: -1 }, 1, 25), /invalid list response/);
});

test("payment services target the dedicated Enterprise BFF for all supported operations", () => {
  const base = "/api/enterprise-commerce";
  assert.equal(buildCommerceUrl("/payments", { page: 2, page_size: 25, status: "processing" }, base), `${base}/payments?page=2&page_size=25&status=processing`);
  assert.equal(buildCommerceUrl(`/payments/${"018f6b54-2a10-7cc4-8b7d-44c5f4b305a1"}`, undefined, base), `${base}/payments/018f6b54-2a10-7cc4-8b7d-44c5f4b305a1`);
  assert.equal(buildCommerceUrl(`/payments/${"018f6b54-2a10-7cc4-8b7d-44c5f4b305a1"}/transactions`, undefined, base), `${base}/payments/018f6b54-2a10-7cc4-8b7d-44c5f4b305a1/transactions`);
});

test("redacts credential-like keys in untyped gateway history", () => {
  assert.deepEqual(redactGatewayHistory({ id: "gateway-1", status: "ok", access_token: "hidden", nested: [{ cvv: "123", amount: "9.10" }] }), {
    id: "gateway-1", status: "ok", access_token: "[redacted]", nested: [{ cvv: "[redacted]", amount: "9.10" }],
  });
});
