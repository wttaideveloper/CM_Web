/** Canonical dedicated Super Admin tenant identity. The UUID is always `id`, never the slug. */
export type PlatformTenant = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string | null;
  lastActivatedAt: string | null;
};

/** Gateway envelope returned by the dedicated tenant collection endpoint. */
export type PlatformTenantsResponse = { items: PlatformTenant[]; total: number };

/** Runtime-verified user membership returned by the dedicated tenant-users endpoint. */
export type PlatformTenantUser = {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  knowledgeRoles: string[];
  membershipStatus: string;
  isSuperAdmin: boolean;
  userStatus: string;
  joinedAt: string | null;
  lastLoginAt: string | null;
  lastActivatedAt: string | null;
};

/** Runtime-verified envelope returned by the dedicated tenant-users endpoint. */
export type PlatformTenantUsersResponse = { items: PlatformTenantUser[]; total: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function readNullableString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return candidate === null || candidate === undefined ? null : typeof candidate === "string" ? candidate : null;
}

/** Parses the runtime-verified dedicated tenant list envelope without accepting slugs as IDs. */
export function parsePlatformTenantsResponse(value: unknown): PlatformTenantsResponse {
  if (!isRecord(value) || !Array.isArray(value.data) || typeof value.total !== "number") {
    throw new Error("Tenant API returned an unsupported response.");
  }

  const items = value.data.map((item) => {
    if (!isRecord(item)) throw new Error("Tenant API returned an unsupported tenant.");
    const id = readRequiredString(item, "id");
    const slug = readRequiredString(item, "slug");
    const name = readRequiredString(item, "name");
    const plan = readRequiredString(item, "plan");
    const status = readRequiredString(item, "status");
    if (!id || !slug || !name || !plan || !status) throw new Error("Tenant API returned an incomplete tenant.");
    return { id, slug, name, plan, status, createdAt: readNullableString(item, "createdAt"), lastActivatedAt: readNullableString(item, "lastActivatedAt") };
  });

  return { items, total: value.total };
}

/** Parses a detail response using the same canonical tenant contract as the list endpoint. */
export function parsePlatformTenantResponse(value: unknown): PlatformTenant {
  if (!isRecord(value)) throw new Error("Tenant API returned an unsupported response.");
  return parsePlatformTenantsResponse({ data: [value.data], total: 1 }).items[0];
}

/** Parses the runtime-verified tenant-user envelope, including the `knowledgeRoles` string array. */
export function parsePlatformTenantUsersResponse(value: unknown): PlatformTenantUsersResponse {
  if (!isRecord(value) || typeof value.message !== "string" || !Array.isArray(value.data) || typeof value.total !== "number") {
    throw new Error("Tenant users API returned an unsupported response.");
  }

  const items = value.data.map((item) => {
    if (!isRecord(item)) throw new Error("Tenant users API returned an unsupported user.");
    const membershipId = readRequiredString(item, "membershipId");
    const userId = readRequiredString(item, "userId");
    const email = readRequiredString(item, "email");
    const fullName = readRequiredString(item, "fullName");
    const role = readRequiredString(item, "role");
    const membershipStatus = readRequiredString(item, "membershipStatus");
    const userStatus = readRequiredString(item, "userStatus");
    const knowledgeRoles = item.knowledgeRoles;
    if (!membershipId || !userId || !email || !fullName || !role || !membershipStatus || !userStatus || !Array.isArray(knowledgeRoles) || !knowledgeRoles.every((knowledgeRole) => typeof knowledgeRole === "string") || typeof item.isSuperAdmin !== "boolean") {
      throw new Error("Tenant users API returned an incomplete user.");
    }
    const joinedAt = readNullableString(item, "joinedAt");
    const lastLoginAt = readNullableString(item, "lastLoginAt");
    const lastActivatedAt = readNullableString(item, "lastActivatedAt");
    if (item.joinedAt !== null && item.joinedAt !== undefined && joinedAt === null || item.lastLoginAt !== null && item.lastLoginAt !== undefined && lastLoginAt === null || item.lastActivatedAt !== null && item.lastActivatedAt !== undefined && lastActivatedAt === null) {
      throw new Error("Tenant users API returned invalid timestamps.");
    }
    return { membershipId, userId, email, fullName, role, knowledgeRoles, membershipStatus, isSuperAdmin: item.isSuperAdmin, userStatus, joinedAt, lastLoginAt, lastActivatedAt };
  });

  return { items, total: value.total };
}
