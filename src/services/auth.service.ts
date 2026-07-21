const WEB_AUTH_BASE_URL = "/api/v1/auth";

export type AuthMembership = {
  tenantRole: string;
  tenantSlug: string;
  tenantName: string;
  knowledgeRoles: string[];
  canInviteUsers: boolean;
  userRole: string;
  tenantRbacRoles: string[];
  tenantPermissions: string[];
};

export type AuthRoles = {
  tenantRole: string;
  tenantSlug: string;
  tenantName: string;
  userRole: string;
  tenantRbacRoles: string[];
  tenantPermissions: string[];
  knowledgeRoles: string[];
  canInviteUsers: boolean;
};

export type AuthUser = {
  id?: string;
  userId?: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  country?: string;
  preferredLocale?: string;
  emailVerified: boolean;
  groups: string[];
  membership: AuthMembership;
  roles: AuthRoles;
};

export type AuthSessionResponse = {
  message?: string;
  data?: AuthUser | null;
  authenticated?: boolean;
  hasActiveTenant?: boolean;
  needsOrganizationSetup?: boolean;
};

export type AuthMeResponse = {
  message?: string;
  data: AuthUser;
};

export type UpdateAuthProfilePayload = {
  fullName: string;
  phone: string;
  address: string;
  country: string;
  preferredLocale: string;
};

export type AuthActionResponse = {
  message?: string;
  data?: unknown;
};

export type InviteRole = {
  slug: string;
  name?: string;
  description?: string;
  membershipTenantRole?: string;
  knowledgeRoleLabel?: string;
  permissions?: string[];
};

export type InviteUserPayload = {
  full_name: string;
  email: string;
  role_slug: string;
};

export type CompleteLoginResponse = AuthSessionResponse & {
  tokens?: {
    access_token: string;
    refresh_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_expires_in: number;
  };
};

export type AuthTenant = {
  id: string;
  name: string;
  slug: string | null;
};

async function parseAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Authentication request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTenantList(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of ["data", "items", "tenants"]) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }

  return [];
}

function readTenantString(value: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function getInviteRoleList(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of ["data", "roles", "items"]) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }

  return [];
}

export function startLogin() {
  const params = new URLSearchParams({
    frontend_origin: window.location.origin,
    return_to: "/auth/validate",
    rememberMe: "false",
    fresh: "true",
  });

  window.location.assign(`${WEB_AUTH_BASE_URL}/login?${params.toString()}`);
}

export async function completeLogin(sessionCode: string) {
  const searchParams = new URLSearchParams({ sessionCode });
  const response = await fetch(`${WEB_AUTH_BASE_URL}/complete-login?${searchParams.toString()}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionCode }),
  });

  return parseAuthResponse<CompleteLoginResponse>(response);
}

export async function getSession() {
  const response = await fetch(`${WEB_AUTH_BASE_URL}/session`, {
    method: "GET",
    credentials: "include",
  });

  return parseAuthResponse<AuthSessionResponse>(response);
}

export async function getAuthMe() {
  const response = await fetch(`${WEB_AUTH_BASE_URL}/me`, {
    method: "GET",
    credentials: "include",
  });

  return parseAuthResponse<AuthMeResponse>(response);
}

export async function updateAuthProfile(payload: UpdateAuthProfilePayload) {
  const response = await fetch(`${WEB_AUTH_BASE_URL}/me/profile`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseAuthResponse<AuthMeResponse>(response);
}

async function postAuthAction(path: string, payload: Record<string, string>) {
  const response = await fetch(`${WEB_AUTH_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseAuthResponse<AuthActionResponse>(response);
}

export function requestPasswordResetCode(email: string) {
  return postAuthAction("/forgot-password", { email });
}

export function verifyPasswordResetCode(email: string, otp: string) {
  return postAuthAction("/verify-reset-code", { email, otp });
}

export function resetPassword(email: string, password: string) {
  return postAuthAction("/reset-password", { email, password });
}

export async function getInviteRoles(): Promise<InviteRole[]> {
  const response = await fetch(`${WEB_AUTH_BASE_URL}/invite/roles`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseAuthResponse<unknown>(response);
  const roles = getInviteRoleList(payload).flatMap((role) => {
    if (!isRecord(role) || typeof role.slug !== "string" || !role.slug.trim()) {
      return [];
    }

    return [{
      slug: role.slug.trim(),
      ...(typeof role.name === "string" ? { name: role.name } : {}),
      ...(typeof role.description === "string" ? { description: role.description } : {}),
      ...(typeof role.membership_tenant_role === "string" ? { membershipTenantRole: role.membership_tenant_role } : {}),
      ...(typeof role.knowledge_role_label === "string" ? { knowledgeRoleLabel: role.knowledge_role_label } : {}),
      ...(Array.isArray(role.permissions) && role.permissions.every((permission) => typeof permission === "string")
        ? { permissions: role.permissions }
        : {}),
    }];
  });

  if (roles.length === 0) {
    throw new Error("No assignable invitation roles were returned.");
  }

  return roles;
}

export function inviteUser(payload: InviteUserPayload) {
  return postAuthAction("/invite", payload);
}

export async function getAuthTenants(): Promise<AuthTenant[]> {
  const response = await fetch(`${WEB_AUTH_BASE_URL}/tenants`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseAuthResponse<unknown>(response);

  const tenantItems = getTenantList(payload);
  const tenants = tenantItems.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const id = readTenantString(item, ["id", "tenantId", "tenant_id"]);
    const name = readTenantString(item, ["name", "tenantName", "tenant_name", "organizationName"]);
    const slug = readTenantString(item, ["slug", "tenantSlug", "tenant_slug"]);

    return id && (name || slug) ? [{ id, name: name ?? slug!, slug }] : [];
  });

  if (tenantItems.length > 0 && tenants.length === 0) {
    throw new Error("Tenant list did not include tenant IDs required to create an enterprise.");
  }

  return tenants;
}

export async function logoutWebAuth() {
  const response = await fetch(`${WEB_AUTH_BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Logout failed with status ${response.status}`);
  }
}
