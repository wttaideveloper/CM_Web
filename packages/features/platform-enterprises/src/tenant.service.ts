import { parsePlatformTenantResponse, parsePlatformTenantsResponse, parsePlatformTenantUsersResponse, type PlatformTenant, type PlatformTenantsResponse, type PlatformTenantUsersResponse } from "./tenant.types";

/** Normalized BFF failure with an HTTP status retained for dedicated tenant authorization UX. */
export class PlatformTenantApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "PlatformTenantApiError";
  }
}

async function requestTenantJson(path: string): Promise<unknown> {
  const response = await fetch(`/api/platform-super-admin${path}`, { credentials: "include", cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string" ? body.detail : "Unable to load tenants.";
    throw new PlatformTenantApiError(response.status, detail);
  }
  return body;
}

/** Retrieves the dedicated Super Admin tenant list through the same-origin Platform BFF. */
export async function getPlatformTenants(): Promise<PlatformTenantsResponse> {
  return parsePlatformTenantsResponse(await requestTenantJson("/tenants"));
}

/** Retrieves only tenants available to the Enterprise module, retaining `tenant.id` as identity. */
export async function getPlatformEnterpriseTenants(): Promise<PlatformTenantsResponse> {
  return parsePlatformTenantsResponse(await requestTenantJson("/tenants/enterprise"));
}

/** Retrieves one tenant using its canonical UUID. */
export async function getPlatformTenant(tenantId: string): Promise<PlatformTenant> {
  return parsePlatformTenantResponse(await requestTenantJson(`/tenants/${encodeURIComponent(tenantId)}`));
}

/** Retrieves users belonging to one canonical-UUID tenant. */
export async function getPlatformTenantUsers(tenantId: string): Promise<PlatformTenantUsersResponse> {
  return parsePlatformTenantUsersResponse(await requestTenantJson(`/tenants/${encodeURIComponent(tenantId)}/users`));
}
