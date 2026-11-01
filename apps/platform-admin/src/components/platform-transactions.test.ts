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
  const { resolveTransactionStatus, transactionFiltersFromQuery } = await import(new URL("./platform-transactions.ts", import.meta.url).href);

  assert.equal(resolveTransactionStatus("successful"), "succeeded");
  assert.equal(resolveTransactionStatus("pending"), "processing");
  assert.equal(resolveTransactionStatus("failed"), "failed");
  assert.equal(resolveTransactionStatus("unknown"), "all");
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
});
