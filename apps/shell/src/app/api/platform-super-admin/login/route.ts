import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "ihp_super_admin_refresh";
const SUPER_ADMIN_AUTH_API_BASE_URL = process.env.SUPER_ADMIN_AUTH_API_BASE_URL;

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

function isIdentity(value: unknown): value is SuperAdminIdentity {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.email === "string"
    && typeof value.fullName === "string"
    && typeof value.isSuperAdmin === "boolean"
    && typeof value.status === "string"
    && typeof value.emailVerified === "boolean"
    && typeof value.keycloakId === "string"
    && typeof value.createdAt === "string";
}

function getCookieDomain(): string | undefined {
  const configuredDomain = process.env.SUPER_ADMIN_SESSION_COOKIE_DOMAIN?.trim().toLowerCase();

  if (!configuredDomain) {
    return undefined;
  }

  if (!/^[a-z0-9.-]+$/.test(configuredDomain)) {
    throw new Error("SUPER_ADMIN_SESSION_COOKIE_DOMAIN is invalid.");
  }

  return configuredDomain;
}

function sessionCookieOptions() {
  const domain = getCookieDomain();

  return {
    httpOnly: true,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
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
    });
  } catch {
    return errorResponse(502, "Unable to reach Super Admin authentication.");
  }

  if (!loginResponse.ok) {
    return errorResponse(loginResponse.status, "Unable to sign in with those Super Admin credentials.");
  }

  const loginBody: unknown = await loginResponse.json().catch(() => null);
  if (!isRecord(loginBody) || !isIdentity(loginBody.data) || !isRecord(loginBody.tokens) || typeof loginBody.tokens.accessToken !== "string" || !loginBody.tokens.accessToken || typeof loginBody.tokens.refreshToken !== "string" || !loginBody.tokens.refreshToken) {
    return errorResponse(502, "Super Admin login returned an unsupported response.");
  }

  if (!loginBody.data.isSuperAdmin) {
    return errorResponse(403, "This account is not authorized for Super Admin access.");
  }

  let verificationResponse: Response;
  try {
    verificationResponse = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${loginBody.tokens.accessToken}` },
      cache: "no-store",
    });
  } catch {
    return errorResponse(502, "Unable to verify the Super Admin session.");
  }

  const verificationBody: unknown = await verificationResponse.json().catch(() => null);
  if (!verificationResponse.ok || !isRecord(verificationBody) || !isIdentity(verificationBody.data) || !verificationBody.data.isSuperAdmin) {
    return errorResponse(401, "Unable to verify the Super Admin session.");
  }

  const response = NextResponse.json({ data: verificationBody.data }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE_NAME, loginBody.tokens.refreshToken, sessionCookieOptions());
  return response;
}
