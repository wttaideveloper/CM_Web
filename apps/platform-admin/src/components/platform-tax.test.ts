import assert from "node:assert/strict";
import test from "node:test";

import type { TaxClassPreview, TaxRulePreview } from "./platform-tax";

test("tax management exposes required preview tax types and illustrative classes", async () => {
  const { taxClassPreviews, taxPreviewMutationsDisabled, taxTypes } = await import(new URL("./platform-tax.ts", import.meta.url).href);
  const classes = taxClassPreviews as readonly TaxClassPreview[];

  assert.deepEqual(taxTypes, ["GST", "VAT", "Sales Tax", "Service Tax"]);
  assert.deepEqual(classes.map((taxClass) => taxClass.name), ["Standard Rated", "Zero Rated", "Exempt"]);
  assert.ok(classes.every((taxClass) => taxClass.status === "illustrative"));
  assert.equal(taxPreviewMutationsDisabled, true);
});

test("tax rules and exemption status filters are scoped without inventing records", async () => {
  const { filterTaxExemptions, filterTaxRules } = await import(new URL("./platform-tax.ts", import.meta.url).href);
  const rule: TaxRulePreview = {
    id: "preview-rule",
    name: "Illustrative GST",
    country: "IN",
    region: "KA",
    taxType: "GST",
    percentage: "Not confirmed",
    effectiveFrom: "Unknown",
    effectiveTo: "Unknown",
    status: "active",
  };

  assert.equal(filterTaxRules([rule], "gst", "IN", "GST", "active").length, 1);
  assert.equal(filterTaxRules([rule], "gst", "US", "GST", "active").length, 0);
  assert.equal(filterTaxExemptions([], "approved").length, 0);
});
