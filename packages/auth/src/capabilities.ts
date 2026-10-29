/** Returns whether the tenant role is the Provider role. */
export function isInternalUserRole(tenantRole: string | null | undefined): boolean {
  return tenantRole?.trim().toLowerCase() === "internal_user";
}
