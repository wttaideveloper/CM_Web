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
