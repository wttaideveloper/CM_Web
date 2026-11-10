/** Returns whether the tenant role is the Provider role. */
export function isInternalUserRole(tenantRole: string | null | undefined): boolean {
  return tenantRole?.trim().toLowerCase() === "internal_user";
}

export type EnterprisePortalRole = "owner" | "staff" | "unknown";

/** Resolves the authenticated tenant role for presentation-only Enterprise portal labels. */
export function resolveEnterprisePortalRole(tenantRole: string | null | undefined): EnterprisePortalRole {
  const normalizedRole = tenantRole?.trim().toLowerCase();
  if (normalizedRole === "tenant_owner") return "owner";
  if (normalizedRole === "internal_user") return "staff";
  return "unknown";
}

/** Returns the neutral-or-authoritative sidebar label for the Enterprise portal. */
export function getEnterpriseSidebarRoleLabel(role: EnterprisePortalRole): string {
  if (role === "owner") return "ENTERPRISE OWNER";
  if (role === "staff") return "STAFF / PROVIDER";
  return "ENTERPRISE";
}

/** Returns the neutral-or-authoritative compact header label for the Enterprise portal. */
export function getEnterpriseHeaderRoleLabel(role: EnterprisePortalRole): string {
  if (role === "owner") return "Enterprise Owner";
  if (role === "staff") return "Staff";
  return "Enterprise";
}
