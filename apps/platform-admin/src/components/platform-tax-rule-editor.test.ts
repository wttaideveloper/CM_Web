import assert from "node:assert/strict";
import test from "node:test";

import type { TaxRuleResponse } from "@ihp/commerce";


const backendRule: TaxRuleResponse = {
  id: "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174",
  rule_key: "example-rule",
  version: 3,
  tax_type: "GST",
  name: "Backend rule",
  country: "IN",
  state: null,
  rate: "18.2500",
  applies_to: "special_product_class",
  condition: "backend_condition_x",
  rounding_mode: "backend_rounding_x",
  reverse_charge_allowed: true,
  priority: 10,
  valid_from: "2026-10-01T00:00:00Z",
  valid_to: null,
  is_active: true,
  is_current: true,
  created_at: "2026-09-01T00:00:00Z",
};

test("edit preview preserves decimal strings, effective date, and custom applicability", async () => {
  const { createTaxRuleDraft, taxRuleAppliesToOptions } = await import(new URL("./platform-tax-rule-editor.ts", import.meta.url).href);
  const draft = createTaxRuleDraft(backendRule);
  assert.equal(draft.rate, "18.2500");
  assert.equal(draft.valid_from, backendRule.valid_from);
  assert.equal(draft.applies_to, "special_product_class");
  assert.ok(taxRuleAppliesToOptions(draft.applies_to).includes("special_product_class"));
});

test("basic draft validation accepts decimal strings without converting rates", async () => {
  const { createTaxRuleDraft, taxRuleAppliesToOptions, validateTaxRuleDraft } = await import(new URL("./platform-tax-rule-editor.ts", import.meta.url).href);
  const draft = createTaxRuleDraft(backendRule);
  assert.deepEqual(validateTaxRuleDraft(draft, taxRuleAppliesToOptions(draft.applies_to)), {});
  assert.equal(draft.rate, "18.2500");
});

test("draft validation rejects negative, percent-formatted, and exponent rates", async () => {
  const { createTaxRuleDraft, validateTaxRuleDraft } = await import(new URL("./platform-tax-rule-editor.ts", import.meta.url).href);
  const draft = createTaxRuleDraft(backendRule);
  for (const rate of ["-1.25", "18%", "1e2"]) {
    assert.equal(validateTaxRuleDraft({ ...draft, rate }).rate, "invalidRate");
  }
  assert.equal(validateTaxRuleDraft({ ...draft, valid_from: "not-a-date" }).valid_from, "invalidValidFrom");
});
