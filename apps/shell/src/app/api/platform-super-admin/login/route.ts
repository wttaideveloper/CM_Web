import { NextResponse } from "next/server";

import { normalizeUpstreamBaseUrl } from "@ihp/shared/upstream-config";

const SESSION_COOKIE_NAME = "ihp_super_admin_refresh";
const REMEMBER_ME_COOKIE_NAME = "ihp_super_admin_remember_me";
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;
// An unset or malformed value leaves the gateway "not configured" (503) instead of guessing a host.
const SUPER_ADMIN_AUTH_API_BASE_URL = normalizeUpstreamBaseUrl(process.env.SUPER_ADMIN_AUTH_API_BASE_URL) ?? undefined;
// Handbook §4: every outbound call has an explicit timeout shorter than the caller's budget.
const SUPER_ADMIN_UPSTREAM_TIMEOUT_MS = 15_000;

type SuperAdminIdentity = {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  status: string;
  emailVerified: boolean;
  keycloakId: string;
  createdAt: string;
};

type LoginPayload = {
  email?: unknown;
  password?: unknown;
  rememberMe?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: Record<string, unknown>, ...keys: string[]): string {
  const candidate = keys.map((key) => value[key]).find((item): item is string => typeof item === "string" && item.trim().length > 0);
  return candidate?.trim() ?? "";
}

function isSuperAdminIdentity(value: Record<string, unknown>): boolean {
  const roles = Array.isArray(value.roles) ? value.roles : [];
  const groups = Array.isArray(value.groups) ? value.groups : [];
  return value.isSuperAdmin === true
    || value.is_super_admin === true
    || value.role === "super_admin"
    || value.user_role === "super_admin"
    || (isRecord(value.roles) && (value.roles.role === "super_admin" || value.roles.userRole === "super_admin" || value.roles.user_role === "super_admin"))
    || roles.some((role) => role === "super_admin" || role === "super-admin" || role === "admin")
    || groups.some((group) => group === "super_admin" || group === "super-admin" || group === "admin");
}

function normalizeIdentity(value: unknown): SuperAdminIdentity | null {
  if (!isRecord(value) || typeof value.id !== "string" || !isSuperAdminIdentity(value)) return null;
  return {
    id: value.id,
    email: stringValue(value, "email", "username"),
    fullName: stringValue(value, "fullName", "full_name", "displayName", "display_name", "name") || value.id,
    isSuperAdmin: true,
    status: stringValue(value, "status") || "active",
    emailVerified: value.emailVerified === true || value.email_verified === true,
    keycloakId: stringValue(value, "keycloakId", "keycloak_id"),
    createdAt: stringValue(value, "createdAt", "created_at"),
  };
}

function tokenValue(value: Record<string, unknown>, ...keys: string[]): string | null {
  const token = keys.map((key) => value[key]).find((item): item is string => typeof item === "string" && item.length > 0);
  return token ?? null;
}

async function upstreamErrorDetail(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body)) return "Unable to sign in with those Super Admin credentials.";
  const detail = body.detail ?? body.message ?? body.error;
  return typeof detail === "string" && detail.trim()
    ? detail.trim().slice(0, 300)
    : "Unable to sign in with those Super Admin credentials.";
}

function getCookieDomain(): string | undefined {
  const configuredDomain = process.env.SUPER_ADMIN_SESSION_COOKIE_DOMAIN?.trim().toLowerCase();

  // Host-only cookies are shared by the local apps because they use the same
  // hostname. Browsers do not consistently accept Domain=localhost.
  if (!configuredDomain || configuredDomain === "localhost" || configuredDomain === "127.0.0.1") {
    return undefined;
  }

  if (!/^[a-z0-9.-]+$/.test(configuredDomain)) {
    throw new Error("SUPER_ADMIN_SESSION_COOKIE_DOMAIN is invalid.");
  }

  return configuredDomain;
}

function sessionCookieOptions(rememberMe: boolean) {
  const domain = getCookieDomain();

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
    ...(domain ? { domain } : {}),
  };
}

function errorResponse(status: number, detail: string): NextResponse {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Authenticates with the dedicated gateway on the server and issues only its refresh credential as an HttpOnly cookie.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) {
    return errorResponse(503, "Super Admin authentication is not configured.");
  }

  let payload: LoginPayload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "A valid login request is required.");
  }

  if (typeof payload.email !== "string" || !payload.email.trim() || typeof payload.password !== "string" || !payload.password) {
    return errorResponse(400, "Email and password are required.");
  }

  let loginResponse: Response;
  try {
    loginResponse = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: payload.email.trim(), password: payload.password, rememberMe: payload.rememberMe === true }),
      cache: "no-store",
      signal: AbortSignal.timeout(SUPER_ADMIN_UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return errorResponse(502, "Unable to reach Super Admin authentication.");
  }

  if (!loginResponse.ok) {
    return errorResponse(loginResponse.status, await upstreamErrorDetail(loginResponse));
  }

  const loginBody: unknown = await loginResponse.json().catch(() => null);
  const loginData = isRecord(loginBody) && isRecord(loginBody.data) ? loginBody.data : null;
  const loginTokens = isRecord(loginBody) && isRecord(loginBody.tokens) ? loginBody.tokens : null;
  const accessToken = loginTokens ? tokenValue(loginTokens, "accessToken", "access_token") : null;
  const refreshToken = loginTokens ? tokenValue(loginTokens, "refreshToken", "refresh_token") : null;
  const identity = loginData ? normalizeIdentity(loginData) : null;
  if (!identity || !accessToken || !refreshToken) {
    return errorResponse(502, "Super Admin login returned an unsupported response.");
  }

  if (!identity.isSuperAdmin) {
    return errorResponse(403, "This account is not authorized for Super Admin access.");
  }

  let verificationResponse: Response;
  try {
    verificationResponse = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SUPER_ADMIN_UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return errorResponse(502, "Unable to verify the Super Admin session.");
  }

  const verificationBody: unknown = await verificationResponse.json().catch(() => null);
  const verifiedIdentity = isRecord(verificationBody) && isRecord(verificationBody.data) ? normalizeIdentity(verificationBody.data) : null;
  if (!verificationResponse.ok || !verifiedIdentity) {
    return errorResponse(401, "Unable to verify the Super Admin session.");
  }

  const response = NextResponse.json({ data: verifiedIdentity }, { headers: { "Cache-Control": "no-store" } });
  const rememberMe = payload.rememberMe === true;
  response.cookies.set(SESSION_COOKIE_NAME, refreshToken, sessionCookieOptions(rememberMe));
  if (rememberMe) {
    response.cookies.set(REMEMBER_ME_COOKIE_NAME, "true", sessionCookieOptions(true));
  } else {
    response.cookies.set(REMEMBER_ME_COOKIE_NAME, "", { ...sessionCookieOptions(false), maxAge: 0 });
  }
  return response;
}
