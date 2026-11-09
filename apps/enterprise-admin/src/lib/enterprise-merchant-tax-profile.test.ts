import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's native TypeScript test runner imports this source file directly.
import { MERCHANT_TAX_PROFILE_MISSING_DETAIL, enterpriseMerchantTaxProfileQueryKey, formatMerchantTaxProfileDate, getEnterpriseMerchantTaxProfileState, hasEnterpriseMerchantTaxProfileScope, isMissingEnterpriseMerchantTaxProfile, merchantTaxProfileDisplayFields, parseEnterpriseMerchantTaxProfile } from "./enterprise-merchant-tax-profile.ts";

const TENANT_ID = "2122fbf0-64cd-4e3b-8ccb-22913912f1ea";

class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const validProfile = {
  country: "IN", state: "Karnataka", tax_id: "29ABCDE1234F1Z5", tax_id_type: "GSTIN",
  legal_name: "Example Business", address: "Bengaluru", is_tax_registered: true,
  tenant_id: TENANT_ID, updated_at: "2026-10-31T10:30:00Z",
};

test("validates and maps the confirmed profile response without altering values", () => {
  const profile = parseEnterpriseMerchantTaxProfile(validProfile, TENANT_ID);
  assert.deepEqual(profile, validProfile);
  assert.deepEqual(merchantTaxProfileDisplayFields(profile), [
    { key: "merchantCountry", value: "IN" }, { key: "merchantState", value: "Karnataka" },
    { key: "merchantTaxId", value: "29ABCDE1234F1Z5" }, { key: "merchantTaxIdType", value: "GSTIN" },
    { key: "merchantLegalName", value: "Example Business" }, { key: "merchantAddress", value: "Bengaluru" },
    { key: "merchantTaxRegistrationStatus", value: "registered" }, { key: "merchantTaxProfileUpdatedAt", value: "2026-10-31T10:30:00Z" },
  ]);
});

test("preserves nullable fields and a false registration status", () => {
  const profile = parseEnterpriseMerchantTaxProfile({ ...validProfile, state: null, tax_id: null, tax_id_type: null, legal_name: null, address: null, is_tax_registered: false, updated_at: null }, TENANT_ID);
  assert.equal(profile.state, null);
  assert.equal(profile.tax_id, null);
  assert.equal(merchantTaxProfileDisplayFields(profile)[6]?.value, "notRegistered");
  assert.equal(formatMerchantTaxProfileDate(profile.updated_at), "");
});

test("rejects mismatched tenant identity and invalid required/nullable fields", () => {
  assert.throws(() => parseEnterpriseMerchantTaxProfile({ ...validProfile, tenant_id: "6cc5b54e-9ed1-471e-ae23-f3d0ca13e662" }, TENANT_ID), /authenticated tenant/);
  assert.throws(() => parseEnterpriseMerchantTaxProfile({ ...validProfile, tenant_id: "not-a-uuid" }, TENANT_ID), /invalid shape/);
  assert.throws(() => parseEnterpriseMerchantTaxProfile({ ...validProfile, country: null }, TENANT_ID), /invalid shape/);
  assert.throws(() => parseEnterpriseMerchantTaxProfile({ ...validProfile, is_tax_registered: "true" }, TENANT_ID), /invalid shape/);
  assert.throws(() => parseEnterpriseMerchantTaxProfile({ ...validProfile, address: 3 }, TENANT_ID), /invalid shape/);
});

test("rejects non-object responses instead of presenting an invented empty profile", () => {
  assert.throws(() => parseEnterpriseMerchantTaxProfile(null, TENANT_ID), /invalid shape/);
  assert.throws(() => parseEnterpriseMerchantTaxProfile([], TENANT_ID), /invalid shape/);
});

test("query keys isolate account, tenant and current enterprise", () => {
  assert.notDeepEqual(enterpriseMerchantTaxProfileQueryKey("account-a", TENANT_ID, "enterprise-a"), enterpriseMerchantTaxProfileQueryKey("account-b", TENANT_ID, "enterprise-a"));
  assert.notDeepEqual(enterpriseMerchantTaxProfileQueryKey("account-a", TENANT_ID, "enterprise-a"), enterpriseMerchantTaxProfileQueryKey("account-a", "other-tenant", "enterprise-a"));
  assert.notDeepEqual(enterpriseMerchantTaxProfileQueryKey("account-a", TENANT_ID, "enterprise-a"), enterpriseMerchantTaxProfileQueryKey("account-a", TENANT_ID, "enterprise-b"));
});

test("only the exact confirmed 404 detail becomes the missing-profile state", () => {
  const confirmed = new ApiError(404, MERCHANT_TAX_PROFILE_MISSING_DETAIL);
  const otherNotFound = new ApiError(404, "Invoice not found");
  assert.equal(isMissingEnterpriseMerchantTaxProfile(confirmed), true);
  assert.equal(isMissingEnterpriseMerchantTaxProfile(otherNotFound), false);
  assert.equal(getEnterpriseMerchantTaxProfileState({ isLoading: false, isError: true, error: confirmed, profile: undefined }), "missing-profile");
  for (const error of [otherNotFound, new ApiError(401, "Not authenticated"), new ApiError(403, "Forbidden"), new Error("Network error")]) {
    assert.equal(getEnterpriseMerchantTaxProfileState({ isLoading: false, isError: true, error, profile: undefined }), "error");
  }
});

test("requires complete authenticated cache scope and distinguishes loading from success", () => {
  assert.equal(hasEnterpriseMerchantTaxProfileScope("account", TENANT_ID, "enterprise"), true);
  assert.equal(hasEnterpriseMerchantTaxProfileScope(null, TENANT_ID, "enterprise"), false);
  assert.equal(hasEnterpriseMerchantTaxProfileScope("account", null, "enterprise"), false);
  assert.equal(hasEnterpriseMerchantTaxProfileScope("account", TENANT_ID, null), false);
  assert.equal(getEnterpriseMerchantTaxProfileState({ isLoading: true, isError: false, error: null, profile: undefined }), "loading");
  assert.equal(getEnterpriseMerchantTaxProfileState({ isLoading: false, isError: false, error: null, profile: parseEnterpriseMerchantTaxProfile(validProfile, TENANT_ID) }), "loaded");
});
