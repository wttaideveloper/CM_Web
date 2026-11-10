import type { MerchantTaxProfileResponse } from "@ihp/commerce";

export type EnterpriseMerchantTaxProfile = MerchantTaxProfileResponse;

export const MERCHANT_TAX_PROFILE_MISSING_DETAIL = "No tax profile yet. Save one with PUT /tax/merchant-profile";

/** Validates the deployed profile schema and binds it to the authenticated tenant. */
export function parseEnterpriseMerchantTaxProfile(value: unknown, authenticatedTenantId: string): EnterpriseMerchantTaxProfile {
  if (!isRecord(value)
    || typeof value.country !== "string"
    || !isNullableString(value.state)
    || !isNullableString(value.tax_id)
    || !isNullableString(value.tax_id_type)
    || !isNullableString(value.legal_name)
    || !isNullableString(value.address)
    || typeof value.is_tax_registered !== "boolean"
    || typeof value.tenant_id !== "string"
    || !UUID_PATTERN.test(value.tenant_id)
    || !isNullableString(value.updated_at)) {
    throw new Error("The merchant tax profile response has an invalid shape.");
  }
  if (value.tenant_id !== authenticatedTenantId) throw new Error("The profile response did not match the authenticated tenant.");
  return {
    country: value.country,
    state: value.state,
    tax_id: value.tax_id,
    tax_id_type: value.tax_id_type,
    legal_name: value.legal_name,
    address: value.address,
    is_tax_registered: value.is_tax_registered,
    tenant_id: value.tenant_id,
    updated_at: value.updated_at,
  };
}

/** Builds an account-, tenant-, and enterprise-scoped key for the profile query. */
export function enterpriseMerchantTaxProfileQueryKey(accountId: string, tenantId: string, enterpriseId: string) {
  return ["enterprise-commerce", accountId, tenantId, enterpriseId, "tax", "merchant-profile"] as const;
}

/** Prevents profile requests until all authenticated cache dimensions are resolved. */
export function hasEnterpriseMerchantTaxProfileScope(accountId: string | null, tenantId: string | null, enterpriseId: string | null): boolean {
  return Boolean(accountId && tenantId && enterpriseId);
}

/** Matches only the confirmed 404 body for an unconfigured profile, not generic not-found errors. */
export function isMissingEnterpriseMerchantTaxProfile(error: unknown): boolean {
  return error instanceof Error
    && "status" in error
    && error.status === 404
    && error.message === MERCHANT_TAX_PROFILE_MISSING_DETAIL;
}

/** Resolves the UI state without interpreting unrelated failures as an absent profile. */
export function getEnterpriseMerchantTaxProfileState(input: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  profile: EnterpriseMerchantTaxProfile | undefined;
}): "loading" | "error" | "missing-profile" | "loaded" {
  if (input.isLoading) return "loading";
  if (input.isError) return isMissingEnterpriseMerchantTaxProfile(input.error) ? "missing-profile" : "error";
  return input.profile ? "loaded" : "error";
}

/** Maps the complete API response to display labels while preserving backend values. */
export function merchantTaxProfileDisplayFields(profile: EnterpriseMerchantTaxProfile): readonly { key: string; value: string }[] {
  return [
    { key: "merchantCountry", value: profile.country },
    { key: "merchantState", value: profile.state ?? "" },
    { key: "merchantTaxId", value: profile.tax_id ?? "" },
    { key: "merchantTaxIdType", value: profile.tax_id_type ?? "" },
    { key: "merchantLegalName", value: profile.legal_name ?? "" },
    { key: "merchantAddress", value: profile.address ?? "" },
    { key: "merchantTaxRegistrationStatus", value: profile.is_tax_registered ? "registered" : "notRegistered" },
    { key: "merchantTaxProfileUpdatedAt", value: profile.updated_at ?? "" },
  ];
}

/** Formats the backend timestamp without inventing a value when it is null or invalid. */
export function formatMerchantTaxProfileDate(value: string | null): string {
  if (value === null) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
