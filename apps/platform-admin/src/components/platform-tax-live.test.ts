import assert from "node:assert/strict";
import test from "node:test";

import type { TaxRuleResponse } from "@ihp/commerce";

test("backend tax rule filters use authoritative fields and preserve unknown tax types", async () => {
  const { filterBackendTaxRules } = await import(new URL("./platform-tax-live.ts", import.meta.url).href);
  const rule: TaxRuleResponse = {
    id: "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174", rule_key: "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174", version: 1,
    tax_type: "OTHER_DEPLOYED_TYPE", name: "Backend rule", country: "IN", state: null, rate: "18.00",
    applies_to: "product-class-x", condition: "intra_state", rounding_mode: "half_up", reverse_charge_allowed: false,
    priority: 1, valid_from: "2026-01-01T00:00:00Z", valid_to: null, is_active: true, is_current: true, created_at: "2026-01-01T00:00:00Z",
  };
  const filters = { search: "class-x", country: "all", taxType: "all", status: "active" as const };
  assert.deepEqual(filterBackendTaxRules([rule], filters), [rule]);
  assert.deepEqual(filterBackendTaxRules([rule], { ...filters, search: "missing" }), []);
  assert.deepEqual(filterBackendTaxRules([rule], { ...filters, status: "inactive" }), []);
});

test("selecting a real rule scopes a versions request and presents returned version fields unchanged", async () => {
  const { taxRuleVersionDetails, taxRuleVersionHistoryDescription, taxRuleVersionsQueryKey } = await import(new URL("./platform-tax-live.ts", import.meta.url).href);
  const rule: TaxRuleResponse = {
    id: "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174", rule_key: "46fcd847-ee32-4f75-bbc8-a3cbb9d6a174", version: 2,
    tax_type: "GST", name: "Backend rule", country: "IN", rate: "0.00", applies_to: "product-class-x",
    condition: "intra_state", rounding_mode: "half_up", reverse_charge_allowed: false, priority: 1,
    valid_from: "2026-02-01T00:00:00Z", valid_to: null, is_active: true, is_current: true,
    created_by: "admin-ref", created_at: "2026-02-01T00:00:00Z", notes: "Backend note", supersedes_id: null,
  };

  assert.deepEqual(taxRuleVersionsQueryKey(rule.id), ["platform-commerce", "tax", "rule-versions", rule.id]);
  assert.match(taxRuleVersionHistoryDescription(rule), new RegExp(rule.id));
  assert.match(taxRuleVersionHistoryDescription(null), /No rules are currently available to select/);
  assert.deepEqual(taxRuleVersionDetails(rule), {
    id: rule.id, version: 2, name: "Backend rule", taxType: "GST", rate: "0.00", appliesTo: "product-class-x",
    effectiveFrom: "2026-02-01T00:00:00Z", effectiveTo: null, active: true, current: true,
    createdAt: "2026-02-01T00:00:00Z", createdBy: "admin-ref", notes: "Backend note", supersedesId: null,
  });
});

test("registration identifiers are masked and tax history parameters retain server paging", async () => {
  const { buildTaxHistoryParams, maskTaxRegistrationNumber } = await import(new URL("./platform-tax-live.ts", import.meta.url).href);
  assert.equal(maskTaxRegistrationNumber("27ABCDE1234F1Z5"), "•••••••••••F1Z5");
  assert.deepEqual(buildTaxHistoryParams({ country: "IN", taxType: "GST", tenantId: "tenant", paymentId: "payment", from: "", to: "", page: 3 }, 50), {
    country: "IN", tax_type: "GST", tenant_id: "tenant", payment_id: "payment", date_from: undefined, date_to: undefined, page: 3, page_size: 50,
  });
});
