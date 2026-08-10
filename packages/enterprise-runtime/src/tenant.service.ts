/** Details for the authenticated user's server-derived tenant. */
export interface TenantDetails {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  settings: Record<string, unknown>;
}

/** A member returned by the current tenant's members API. */
export interface TenantMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  roleName: string;
  status: string;
  roleSlug: string;
}

/** A tenant RBAC role returned by the tenant roles API. */
export interface TenantRole {
  slug: string;
  name: string;
  description?: string | null;
  membershipTenantRole?: string | null;
  knowledgeRoleLabel?: string | null;
  isAssignable?: boolean | null;
  inviteRequiresOwner?: boolean | null;
  displayOrder?: number | null;
  permissions: string[];
}

/** A permission definition returned by the tenant permissions API. */
export interface TenantPermission {
  code: string;
  name?: string | null;
  description?: string | null;
}

/** A typed collection response returned by tenant APIs. */
export type TenantListResponse<T> = {
  message: string;
  data: T[];
  total: number;
};

/** The tenant roles collection response. */
export type TenantRolesResponse = TenantListResponse<TenantRole>;

/** The tenant permissions collection response. */
export type TenantPermissionsResponse = TenantListResponse<TenantPermission>;

type TenantRoleResponseItem = {
  slug: string;
  name: string;
  description?: string | null;
  membership_tenant_role?: string | null;
  knowledge_role_label?: string | null;
  is_assignable?: boolean | null;
  invite_requires_owner?: boolean | null;
  display_order?: number | null;
  permissions: string[];
};

/** The authenticated tenant response envelope. */
export type TenantMeResponse = {
  message: string;
  data: TenantDetails;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTenantMember(value: unknown): value is TenantMember {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.fullName === "string" &&
    typeof value.role === "string" &&
    typeof value.roleName === "string" &&
    typeof value.status === "string" &&
    typeof value.roleSlug === "string"
  );
}

function isTenantDetails(value: unknown): value is TenantDetails {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    typeof value.plan === "string" &&
    typeof value.status === "string" &&
    isRecord(value.settings)
  );
}

function isTenantRole(value: unknown): value is TenantRoleResponseItem {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    isOptionalString(value.description) &&
    isOptionalString(value.membership_tenant_role) &&
    isOptionalString(value.knowledge_role_label) &&
    isOptionalBoolean(value.is_assignable) &&
    isOptionalBoolean(value.invite_requires_owner) &&
    isOptionalNumber(value.display_order) &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission) => typeof permission === "string")
  );
}

function isTenantPermission(value: unknown): value is TenantPermission {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    isOptionalString(value.name) &&
    isOptionalString(value.description)
  );
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalBoolean(value: unknown): value is boolean | null | undefined {
  return value === undefined || value === null || typeof value === "boolean";
}

function isOptionalNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || typeof value === "number";
}

/** Loads the authenticated user's current tenant. */
export async function getTenantMe(): Promise<TenantMeResponse> {
  const response = await fetch("/api/v1/tenant/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Unable to load tenant (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  if (!isRecord(payload) || typeof payload.message !== "string" || !isTenantDetails(payload.data)) {
    throw new Error("Invalid tenant response.");
  }

  return {
    message: payload.message,
    data: payload.data,
  };
}

/** Loads the current tenant's members from the documented list response envelope. */
export async function getTenantMembers(): Promise<TenantMember[]> {
  const response = await fetch("/api/v1/tenant/members", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Unable to load tenant members (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  if (
    !isRecord(payload) ||
    typeof payload.message !== "string" ||
    typeof payload.total !== "number" ||
    !Array.isArray(payload.data) ||
    !payload.data.every(isTenantMember)
  ) {
    throw new Error("Invalid tenant members response.");
  }

  return payload.data;
}

/** Loads the current tenant's complete RBAC role catalogue. */
export async function getTenantRoles(): Promise<TenantRolesResponse> {
  const response = await fetch("/api/v1/tenant/roles", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Unable to load tenant roles (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  if (
    !isRecord(payload) ||
    typeof payload.message !== "string" ||
    typeof payload.total !== "number" ||
    !Array.isArray(payload.data) ||
    !payload.data.every(isTenantRole)
  ) {
    throw new Error("Invalid tenant roles response.");
  }

  return {
    message: payload.message,
    data: payload.data.map((role) => ({
      slug: role.slug,
      name: role.name,
      description: role.description,
      membershipTenantRole: role.membership_tenant_role,
      knowledgeRoleLabel: role.knowledge_role_label,
      isAssignable: role.is_assignable,
      inviteRequiresOwner: role.invite_requires_owner,
      displayOrder: role.display_order,
      permissions: role.permissions,
    })),
    total: payload.total,
  };
}

/** Loads the current tenant's permission definitions. */
export async function getTenantPermissions(): Promise<TenantPermissionsResponse> {
  const response = await fetch("/api/v1/tenant/permissions", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Unable to load tenant permissions (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  if (
    !isRecord(payload) ||
    typeof payload.message !== "string" ||
    typeof payload.total !== "number" ||
    !Array.isArray(payload.data) ||
    !payload.data.every(isTenantPermission)
  ) {
    throw new Error("Invalid tenant permissions response.");
  }

  return {
    message: payload.message,
    data: payload.data,
    total: payload.total,
  };
}
