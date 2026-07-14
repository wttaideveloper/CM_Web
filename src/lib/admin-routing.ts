export type AdminTenantRole = string | null;

export const PROVIDER_ADMIN_ROUTES = new Set(["/admin/messages", "/admin/notifications"]);

export function isProviderAdminRole(tenantRole: AdminTenantRole): boolean {
  return tenantRole === "tenant_admin" || tenantRole === "internal_user";
}

export function isOwnerAdminRole(tenantRole: AdminTenantRole): boolean {
  return tenantRole === "tenant_owner" || tenantRole === "admin";
}

export function resolveAdminLandingRoute(tenantRole: AdminTenantRole): string {
  if (tenantRole === "tenant_owner" || tenantRole === "admin") {
    return "/admin/dashboard";
  }

  return "/admin/messages";
}

export function canAccessAdminPath(pathname: string, tenantRole: AdminTenantRole): boolean {
  if (isOwnerAdminRole(tenantRole)) {
    return pathname.startsWith("/admin");
  }

  if (isProviderAdminRole(tenantRole)) {
    return PROVIDER_ADMIN_ROUTES.has(pathname);
  }

  return false;
}
