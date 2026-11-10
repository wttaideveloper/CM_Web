import assert from "node:assert/strict";
import test from "node:test";
import type { CurrencyPreview } from "./platform-currencies";

test("currency management uses clearly marked preview data without exchange-rate values", async () => {
  const { commercePreviewMutationsDisabled, currencyPreviews, currencySectionHeadingIds, exchangeRateHistoryPreviews, exchangeRatePreview, filterCurrencyPreviews, filterExchangeRateHistory, togglePreviewPanel } = await import(new URL("./platform-currencies.ts", import.meta.url).href);
  const previews = currencyPreviews as readonly CurrencyPreview[];
  assert.deepEqual(previews.map((currency) => currency.code), ["INR", "USD", "EUR", "GBP", "AED"]);
  assert.ok(previews.every((currency) => currency.status === "preview-only"));
  assert.ok(previews.every((currency) => currency.minimumPayment === "Not confirmed"));
  assert.equal(exchangeRatePreview.baseCurrency, "Not configured");
  assert.equal(exchangeRatePreview.rate, "Not available");
  assert.equal(exchangeRateHistoryPreviews.length, 0);
  const gbpPreview = filterCurrencyPreviews(previews, "gbp", "all") as readonly CurrencyPreview[];
  const allPreview = filterCurrencyPreviews(previews, "", "preview-only") as readonly CurrencyPreview[];
  assert.deepEqual(gbpPreview.map((currency) => currency.code), ["GBP"]);
  assert.deepEqual(allPreview.map((currency) => currency.code), ["INR", "USD", "EUR", "GBP", "AED"]);
  assert.deepEqual(filterExchangeRateHistory([{ baseCurrency: "INR", targetCurrency: "USD", rate: "not available", source: "unknown", lastUpdated: "unknown", effectiveDate: "unknown", updatedBy: "unknown", override: "unknown" }], "INR/USD").length, 1);
  assert.equal(togglePreviewPanel(false), true);
  assert.equal(togglePreviewPanel(true), false);
  assert.equal(commercePreviewMutationsDisabled, true);
  assert.deepEqual(Object.values(currencySectionHeadingIds), ["base-currency-title", "supported-currencies-title", "exchange-rates-title", "exchange-rate-history-title", "provider-settings-title", "enterprise-currency-title"]);
});
