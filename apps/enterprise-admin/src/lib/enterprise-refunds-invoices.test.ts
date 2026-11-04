import assert from "node:assert/strict";
import test from "node:test";
import type { InvoiceResponse, RefundResponse } from "@ihp/commerce";

// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
import { assertEnterpriseInvoiceListTenant, assertEnterpriseInvoiceTemplateTenant, assertEnterpriseInvoiceTenant, assertEnterpriseRefundListTenant, assertEnterpriseRefundTenant, buildEnterpriseInvoiceParams, buildEnterpriseRefundParams, enterpriseFinanceAmount, enterpriseFinanceErrorKey, enterpriseFinancePageCount, enterpriseRefundsInvoicesQueryKeys, hasEnterpriseFinanceScope, normalizeEnterpriseFinancePage } from "./enterprise-refunds-invoices.ts";
// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
import { buildCommerceUrl } from "../../../../packages/features/commerce/src/commerce-url.ts";

test("refund and invoice filters use page pagination and omit tenant overrides", () => {
  const refunds = buildEnterpriseRefundParams({ status: "processing", paymentId: " payment-1 ", dateFrom: "2026-01-01", dateTo: "2026-01-31", overdue: "false" }, 2);
  const invoices = buildEnterpriseInvoiceParams({ documentType: "credit_note", paymentId: "pay-2", search: " INV-1 ", dateFrom: "", dateTo: "2026-02-01" }, 3);
  assert.deepEqual(refunds, { page: 2, page_size: 25, status: "processing", payment_id: "payment-1", date_from: "2026-01-01", date_to: "2026-01-31", overdue: false });
  assert.deepEqual(invoices, { page: 3, page_size: 25, doc_type: "credit_note", payment_id: "pay-2", search: "INV-1", date_from: undefined, date_to: "2026-02-01" });
  assert.equal("tenant_id" in refunds, false);
  assert.equal("tenant_id" in invoices, false);
  assert.equal(buildCommerceUrl("/refunds", refunds, "/api/enterprise-commerce"), "/api/enterprise-commerce/refunds?page=2&page_size=25&status=processing&payment_id=payment-1&date_from=2026-01-01&date_to=2026-01-31&overdue=false");
  assert.equal(buildCommerceUrl("/invoices", invoices, "/api/enterprise-commerce"), "/api/enterprise-commerce/invoices?page=3&page_size=25&doc_type=credit_note&payment_id=pay-2&search=INV-1&date_to=2026-02-01");
});

test("finance list fallback preserves totals and requested page metadata", () => {
  assert.deepEqual(normalizeEnterpriseFinancePage({ items: [], total: 0 }, 2, 25), { items: [], total: 0, page: 2, page_size: 25 });
  assert.deepEqual(normalizeEnterpriseFinancePage({ items: ["record"], total: 30, page: 1, page_size: 10 }, 2, 25), { items: ["record"], total: 30, page: 1, page_size: 10 });
  assert.throws(() => normalizeEnterpriseFinancePage({ items: [] }, 1, 25), /invalid list response/);
  assert.equal(enterpriseFinancePageCount(0, 25), 1);
  assert.equal(enterpriseFinancePageCount(26, 25), 2);
});

test("financial cache keys are account, tenant and enterprise scoped", () => {
  const first = enterpriseRefundsInvoicesQueryKeys("account-1", "tenant-1", "enterprise-1");
  const otherAccount = enterpriseRefundsInvoicesQueryKeys("account-2", "tenant-1", "enterprise-1");
  const otherTenant = enterpriseRefundsInvoicesQueryKeys("account-1", "tenant-2", "enterprise-1");
  const otherEnterprise = enterpriseRefundsInvoicesQueryKeys("account-1", "tenant-1", "enterprise-2");
  assert.notDeepEqual(first.refund("refund-id"), otherAccount.refund("refund-id"));
  assert.notDeepEqual(first.refund("refund-id"), otherTenant.refund("refund-id"));
  assert.notDeepEqual(first.invoice("invoice-id"), otherEnterprise.invoice("invoice-id"));
  assert.notDeepEqual(first.invoiceTemplates, otherEnterprise.invoiceTemplates);
  assert.equal(hasEnterpriseFinanceScope("account-1", "tenant-1", "enterprise-1"), true);
  assert.equal(hasEnterpriseFinanceScope("account-1", null, "enterprise-1"), false);
  assert.equal(hasEnterpriseFinanceScope(null, "tenant-1", "enterprise-1"), false);
});

test("refund and invoice lists/details reject mismatched tenant records instead of filtering them", () => {
  const refund = { id: "r1", tenant_id: "tenant-1" } as unknown as RefundResponse;
  const invoice = { id: "i1", tenant_id: "tenant-1" } as unknown as InvoiceResponse;
  assert.equal(assertEnterpriseRefundTenant(refund, "tenant-1"), refund);
  assert.equal(assertEnterpriseInvoiceTenant(invoice, "tenant-1"), invoice);
  assert.equal(assertEnterpriseRefundListTenant({ items: [refund] }, "tenant-1").items.length, 1);
  assert.equal(assertEnterpriseInvoiceListTenant({ items: [invoice] }, "tenant-1").items.length, 1);
  assert.throws(() => assertEnterpriseRefundTenant({ ...refund, tenant_id: "tenant-2" }, "tenant-1"), /authenticated tenant scope/);
  assert.throws(() => assertEnterpriseInvoiceListTenant({ items: [invoice, { ...invoice, tenant_id: "tenant-2" }] }, "tenant-1"), /authenticated tenant scope/);
  assert.throws(() => assertEnterpriseRefundListTenant({ items: [{ ...refund, tenant_id: "tenant-2" }] }, "tenant-1"), /authenticated tenant scope/);
});

test("invoice templates accept platform-default null tenant and reject another tenant", () => {
  const platformDefault = { tenant_id: null, number_prefix: "INV" } as never;
  assert.equal(assertEnterpriseInvoiceTemplateTenant(platformDefault, "tenant-1"), platformDefault);
  assert.equal((assertEnterpriseInvoiceTemplateTenant({ number_prefix: "INV" } as never, "tenant-1") as { number_prefix: string }).number_prefix, "INV");
  assert.throws(() => assertEnterpriseInvoiceTemplateTenant({ tenant_id: "tenant-2" } as never, "tenant-1"), /authenticated tenant scope/);
});

test("amount formatting preserves exact backend decimal strings", () => {
  assert.equal(enterpriseFinanceAmount("9007199254740993.01", "INR"), "9007199254740993.01 INR");
  assert.equal(enterpriseFinanceAmount("0.00", "USD"), "0.00 USD");
});

test("backend authorization and missing-record errors remain distinct from empty lists", async () => {
  const apiError = (status: number) => Object.assign(new Error("request failed"), { status });
  assert.equal(enterpriseFinanceErrorKey(apiError(401)), "unauthorized");
  assert.equal(enterpriseFinanceErrorKey(apiError(403)), "forbidden");
  assert.equal(enterpriseFinanceErrorKey(apiError(404)), "notFound");
  assert.equal(enterpriseFinanceErrorKey(apiError(500)), "loadError");
  assert.equal(enterpriseFinanceErrorKey(new Error("network")), "loadError");
  assert.deepEqual(normalizeEnterpriseFinancePage({ items: [], total: 0 }, 1, 25).items, []);
});
