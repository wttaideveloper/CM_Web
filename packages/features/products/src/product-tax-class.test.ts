import assert from "node:assert/strict";
import test from "node:test";

import { productTaxClassEnglish } from "./product-tax-class.en.ts";
import { buildProductTaxClassPayload, getProductTaxClassOptions, normalizeProductTaxClass } from "./product-tax-class.ts";

test("tax-class labels do not claim a percentage and keep compatible identifiers", () => {
  const options = getProductTaxClassOptions(productTaxClassEnglish);

  assert.deepEqual(options, [
    { value: "standard", label: "standard" },
    { value: "reduced", label: "reduced" },
    { value: "zero_rate", label: "zero_rate" },
  ]);
  assert.ok(options.every(({ label }) => !label.includes("%")));
  assert.match(productTaxClassEnglish.explanation, /backend Tax Rules during checkout/);
});

test("an unknown existing tax class remains visible and selectable", () => {
  const currentValue = normalizeProductTaxClass(" enterprise_special ");
  const options = getProductTaxClassOptions(productTaxClassEnglish, currentValue);

  assert.equal(currentValue, "enterprise_special");
  assert.deepEqual(options.at(-1), { value: "enterprise_special", label: "enterprise_special" });
  assert.equal(options.filter(({ value }) => value === "enterprise_special").length, 1);
});

test("tax-class payload preserves the selected backend value and omits blank values", () => {
  assert.deepEqual(buildProductTaxClassPayload(" enterprise_special "), { tax_class: "enterprise_special" });
  assert.deepEqual(buildProductTaxClassPayload(""), {});
  assert.deepEqual(buildProductTaxClassPayload(null), {});
});
