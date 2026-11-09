import assert from "node:assert/strict";
import test from "node:test";

test("currency integration preserves authoritative base currency values", async () => {
  const { readBaseCurrency } = await import(new URL("./platform-currencies-live.ts", import.meta.url).href);
  assert.equal(readBaseCurrency("INR"), "INR");
  assert.equal(readBaseCurrency({ base_currency: "INR" }), "INR");
  assert.equal(readBaseCurrency(undefined, "INR"), "INR");
  assert.equal(readBaseCurrency({ loaded_rates: 1912 }), "Not supplied");
});

test("rate history uses requested pagination when the live response omits echoed fields", async () => {
  const { resolveRateHistoryPagination } = await import(new URL("./platform-currencies-live.ts", import.meta.url).href);
  const result = resolveRateHistoryPagination({ items: [], total: 1916 }, 1, 25);
  assert.deepEqual(result, { page: 1, pageSize: 25, total: 1916, totalPages: 77 });
  assert.equal(resolveRateHistoryPagination({ items: [], total: 1916 }, 2, 25).page, 2);
});
