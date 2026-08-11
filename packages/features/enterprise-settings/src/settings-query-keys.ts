/** Stable React Query keys for server-derived Enterprise Settings tenant resources. */
export const settingsQueryKeys = {
  members: (tenantId: string) => ["tenant", tenantId, "members"] as const,
  roles: (tenantId: string) => ["tenant", tenantId, "roles"] as const,
  permissions: (tenantId: string) => ["tenant", tenantId, "permissions"] as const,
};
