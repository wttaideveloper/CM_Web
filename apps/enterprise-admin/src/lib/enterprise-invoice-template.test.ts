import assert from "node:assert/strict";
import test from "node:test";
import type { InvoiceTemplateResponse } from "@ihp/commerce";

import { buildInvoiceTemplateDisplayFields, getSafeInvoiceLogoUrl, INVOICE_TEMPLATE_PANEL_DEFAULT_EXPANDED, isInvoiceTemplateQueryEnabled } from "./enterprise-invoice-template.ts";

test("template panel starts expanded and its request requires authenticated Enterprise scope", () => {
  assert.equal(INVOICE_TEMPLATE_PANEL_DEFAULT_EXPANDED, true);
  assert.equal(isInvoiceTemplateQueryEnabled("account-1", "enterprise-1", INVOICE_TEMPLATE_PANEL_DEFAULT_EXPANDED), true);
  assert.equal(isInvoiceTemplateQueryEnabled("account-1", "enterprise-1", false), false);
  assert.equal(isInvoiceTemplateQueryEnabled(null, "enterprise-1", true), false);
  assert.equal(isInvoiceTemplateQueryEnabled("account-1", "", true), false);
});

test("invoice template display includes all supported fields and preserves false values", () => {
  const fields = buildInvoiceTemplateDisplayFields({
    display_name: "Clinic",
    number_prefix: "INV",
    locale: "en-IN",
    accent_color: "#1f3a5f",
    logo_url: "/assets/logo.svg",
    address: "Main Street",
    footer_text: "Thank you",
    terms: "Due on receipt",
    show_exchange_rate: false,
    is_default: false,
  });

  assert.deepEqual(fields.map(({ key }) => key), [
    "displayName", "numberPrefix", "locale", "accentColor", "logo", "address", "footerText", "terms", "exchangeRateShown", "defaultTemplate",
  ]);
  assert.equal(fields.find(({ key }) => key === "exchangeRateShown")?.value, false);
  assert.equal(fields.find(({ key }) => key === "defaultTemplate")?.value, false);
  assert.equal(fields.find(({ key }) => key === "accentColor")?.swatchColor, "#1f3a5f");
  assert.equal(fields.find(({ key }) => key === "logo")?.imageUrl, "/assets/logo.svg");
});

test("missing and null template values remain absent instead of being fabricated", () => {
  const nullableRuntimeResponse = { display_name: null, logo_url: null, show_exchange_rate: null } as unknown as InvoiceTemplateResponse;
  const fields = buildInvoiceTemplateDisplayFields(nullableRuntimeResponse);
  assert.ok(fields.every(({ value }) => value === null));
  assert.equal(fields.find(({ key }) => key === "logo")?.imageUrl, undefined);
});

test("logo URL validation rejects unsafe schemes, protocol-relative paths and credentials", () => {
  assert.equal(getSafeInvoiceLogoUrl("https://cdn.example.test/logo.png"), "https://cdn.example.test/logo.png");
  assert.equal(getSafeInvoiceLogoUrl("/private/logo.png"), "/private/logo.png");
  assert.equal(getSafeInvoiceLogoUrl("javascript:alert(1)"), null);
  assert.equal(getSafeInvoiceLogoUrl("//tracker.example/logo.png"), null);
  assert.equal(getSafeInvoiceLogoUrl("http://cdn.example.test/logo.png"), null);
  assert.equal(getSafeInvoiceLogoUrl("https://user:secret@cdn.example.test/logo.png"), null);
});

test("unsupported color strings do not become CSS swatches", () => {
  const accent = buildInvoiceTemplateDisplayFields({ accent_color: "url(javascript:alert(1))" }).find(({ key }) => key === "accentColor");
  assert.ok(accent);
  assert.equal(accent.value, "url(javascript:alert(1))");
  assert.equal(accent.swatchColor, undefined);
});
