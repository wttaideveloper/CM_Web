import { useQuery } from "@tanstack/react-query";

import { getPlatformEnterpriseTenants, getPlatformTenant, getPlatformTenants, getPlatformTenantUsers } from "./tenant.service";

/** Dedicated Platform tenant query keys remain isolated from legacy WebAuth tenant discovery. */
export const platformTenantKeys = {
  all: ["platform-super-admin", "tenants"] as const,
  enterpriseList: () => ["platform-super-admin", "tenants", "enterprise"] as const,
  detail: (tenantId: string) => ["platform-super-admin", "tenants", tenantId] as const,
  users: (tenantId: string) => ["platform-super-admin", "tenants", tenantId, "users"] as const,
};

/** Queries the dedicated Super Admin tenant collection. */
export function usePlatformTenants() {
  return useQuery({ queryKey: platformTenantKeys.all, queryFn: getPlatformTenants, retry: 1, staleTime: 30_000 });
}

/** Queries only Enterprise-module tenants, isolated from the global tenant collection cache. */
export function usePlatformEnterpriseTenants() {
  return useQuery({ queryKey: platformTenantKeys.enterpriseList(), queryFn: getPlatformEnterpriseTenants, retry: 1, staleTime: 30_000 });
}

/** Queries a dedicated tenant only while a canonical identifier is selected. */
export function usePlatformTenant(tenantId: string | null) {
  return useQuery({ queryKey: platformTenantKeys.detail(tenantId ?? ""), queryFn: () => getPlatformTenant(tenantId ?? ""), enabled: Boolean(tenantId), retry: 1, staleTime: 30_000 });
}

/** Queries dedicated tenant users only while the users panel is open for a selected tenant. */
export function usePlatformTenantUsers(tenantId: string | null) {
  return useQuery({ queryKey: platformTenantKeys.users(tenantId ?? ""), queryFn: () => getPlatformTenantUsers(tenantId ?? ""), enabled: Boolean(tenantId), retry: 1, staleTime: 30_000 });
}
