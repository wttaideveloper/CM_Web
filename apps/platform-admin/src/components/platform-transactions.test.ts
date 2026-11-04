import assert from "node:assert/strict";
import test from "node:test";

import type { TransactionStatus } from "./platform-transactions";

test("transaction status labels cover the documented Payments API statuses", async () => {
  const { getTransactionStatusLabel, transactionStatuses } = await import(new URL("./platform-transactions.ts", import.meta.url).href);
  const statuses = transactionStatuses as readonly TransactionStatus[];

  assert.equal(statuses.length, 11);
  assert.equal(getTransactionStatusLabel("processing"), "Processing");
  assert.equal(getTransactionStatusLabel("review"), "Under review");
  assert.equal(getTransactionStatusLabel("partially_refunded"), "Partially refunded");
  assert.notEqual(getTransactionStatusLabel("processing"), getTransactionStatusLabel("failed"));
});

test("transaction filtering remains empty and does not create financial records", async () => {
  const { filterTransactions, transactionPreviews } = await import(new URL("./platform-transactions.ts", import.meta.url).href);

  assert.equal(transactionPreviews.length, 0);
  assert.equal(filterTransactions(transactionPreviews, { search: "", enterprise: "", module: "", currency: "", status: "all" }).length, 0);
});

test("transaction query parameters map dashboard labels to documented statuses", async () => {
  const { resolveTransactionStatus, transactionFiltersFromQuery, buildPaymentListParams } = await import(new URL("./platform-transactions.ts", import.meta.url).href);

  assert.equal(resolveTransactionStatus("successful"), "succeeded");
  assert.equal(resolveTransactionStatus("pending"), "processing");
  assert.equal(resolveTransactionStatus("failed"), "failed");
  assert.equal(resolveTransactionStatus("future_status"), "future_status");
  const queryValues: Record<string, string> = { status: "succeeded", module: "Services", from: "2026-01-01" };
  assert.deepEqual(transactionFiltersFromQuery({ get: (key: string) => queryValues[key] ?? null }), {
    search: "",
    enterprise: "",
    module: "Services",
    currency: "",
    status: "succeeded",
    from: "2026-01-01",
    to: "",
  });
  assert.deepEqual(buildPaymentListParams({ search: "", enterprise: "tenant-7", module: "", currency: "INR", status: "processing", from: "2026-01-01", to: "2026-01-31" }, 2, 25), {
    status: "processing",
    currency: "INR",
    tenant_id: "tenant-7",
    date_from: "2026-01-01",
    date_to: "2026-01-31",
    page: 2,
    page_size: 25,
  });
});

test("payment display helpers preserve backend references and decimal strings", async () => {
  const { getPaymentCustomerReference, getPaymentEnterpriseReference, getPaymentModule, getPaymentStatusLabel } = await import(new URL("./platform-transactions.ts", import.meta.url).href);
  const payment = {
    id: "payment-1",
    status: "future_status",
    status_label: "Future status",
    purchase_type: "training",
    purchase_id: "training-1",
    attempt_no: 1,
    tenant_id: "tenant-1",
    customer_user_id: "customer-1",
    customer_email: "customer@example.test",
    provider: "razorpay",
    capture_method: "automatic",
    item_currency: "INR",
    subtotal_amount: "100.10",
    tax_amount: "18.02",
    total_amount: "118.12",
    charge_currency: "INR",
    charge_subtotal: "100.10",
    charge_tax: "18.02",
    charge_total: "118.12",
    exchange_rate: "1.0",
    base_currency: "INR",
    base_total: "118.12",
    refunded_amount: "0.00",
    refundable_amount: "118.12",
    lines: [],
    tax_breakdown: [],
    created_at: "2026-11-02T00:00:00Z",
  };
  assert.equal(getPaymentCustomerReference(payment), "customer@example.test");
  assert.equal(getPaymentEnterpriseReference(payment), "tenant-1");
  assert.equal(getPaymentModule(payment), "training");
  assert.equal(getPaymentStatusLabel(payment), "Future status");
  assert.equal(payment.total_amount, "118.12");
});
