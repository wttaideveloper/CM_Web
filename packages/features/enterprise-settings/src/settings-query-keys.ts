/** Stable React Query keys for server-derived Enterprise Settings tenant resources. */
export const settingsQueryKeys = {
  members: (tenantId: string) => ["tenant", tenantId, "members"] as const,
  member: (tenantId: string, membershipId: string) => ["tenant", tenantId, "members", membershipId] as const,
  roles: (tenantId: string) => ["tenant", tenantId, "roles"] as const,
  permissions: (tenantId: string) => ["tenant", tenantId, "permissions"] as const,
};
