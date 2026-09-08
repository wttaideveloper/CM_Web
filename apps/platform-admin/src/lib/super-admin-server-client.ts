import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "ihp_super_admin_refresh";
const SUPER_ADMIN_AUTH_API_BASE_URL = process.env.SUPER_ADMIN_AUTH_API_BASE_URL;

type RefreshResponse = { tokens: { accessToken: string; refreshToken?: string } };
type SuperAdminAccessToken = { accessToken: string; rotatedRefreshToken?: string };

/** Error returned by the dedicated Super Admin gateway after server-side normalization. */
export class SuperAdminServerError extends Error {
  constructor(readonly status: number, message: string, readonly clearSession = false) {
    super(message);
    this.name = "SuperAdminServerError";
  }
}

/** Successful dedicated gateway result, including an optional rotated refresh credential. */
export type SuperAdminServerResult = { body: unknown; rotatedRefreshToken?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCookieDomain(): string | undefined {
  const configuredDomain = process.env.SUPER_ADMIN_SESSION_COOKIE_DOMAIN?.trim().toLowerCase();
  if (!configuredDomain) return undefined;
  if (!/^[a-z0-9.-]+$/.test(configuredDomain)) throw new SuperAdminServerError(503, "Super Admin authentication is not configured.");
  return configuredDomain;
}

function sessionCookieOptions() {
  const domain = getCookieDomain();
  return { httpOnly: true, path: "/", sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", ...(domain ? { domain } : {}) };
}

/** Clears the Platform bridge credential using the same scope used when it was issued. */
export function clearSuperAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveValues);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["accessToken", "access_token", "refreshToken", "refresh_token", "authorization"].includes(key))
    .map(([key, nestedValue]) => [key, redactSensitiveValues(nestedValue)]));
}

function gatewayError(status: number): SuperAdminServerError {
  if (status === 401) return new SuperAdminServerError(401, "Super Admin authentication is required.");
  if (status === 403) return new SuperAdminServerError(403, "You do not have permission to access tenant data.");
  return new SuperAdminServerError(502, "Unable to load tenant data.");
}

function refreshFailure(status: number): SuperAdminServerError {
  if (status === 400 || status === 401) {
    return new SuperAdminServerError(401, "Super Admin authentication is required.", true);
  }
  return gatewayError(status);
}

/** Obtains the short-lived dedicated access token without exposing it outside this server module. */
async function getSuperAdminAccessToken(): Promise<SuperAdminAccessToken> {
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) throw new SuperAdminServerError(503, "Super Admin authentication is not configured.");
  const refreshToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!refreshToken) throw new SuperAdminServerError(401, "Super Admin authentication is required.");

  let refreshResponse: Response;
  try {
    refreshResponse = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Token-Delivery": "body" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    throw new SuperAdminServerError(502, "Unable to load tenant data.");
  }

  const refreshBody: unknown = await refreshResponse.json().catch(() => null);
  if (!refreshResponse.ok || !isRecord(refreshBody) || !isRecord(refreshBody.tokens) || typeof refreshBody.tokens.accessToken !== "string" || !refreshBody.tokens.accessToken) {
    throw refreshFailure(refreshResponse.status);
  }

  const refresh = refreshBody as RefreshResponse;
  return {
    accessToken: refresh.tokens.accessToken,
    ...(typeof refresh.tokens.refreshToken === "string" && refresh.tokens.refreshToken ? { rotatedRefreshToken: refresh.tokens.refreshToken } : {}),
  };
}

/** Calls a dedicated Super Admin endpoint with a server-only bearer token and preserves its HTTP result. */
export async function requestSuperAdminJson(
  path: string,
  init: Pick<RequestInit, "body" | "headers" | "method"> = {},
): Promise<SuperAdminServerResult & { status: number }> {
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) throw new SuperAdminServerError(503, "Super Admin authentication is not configured.");
  const { accessToken, rotatedRefreshToken } = await getSuperAdminAccessToken();

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1${path}`, {
      method: init.method,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      body: init.body,
      cache: "no-store",
    });
  } catch {
    throw new SuperAdminServerError(502, "Unable to load tenant data.");
  }

  const body: unknown = await upstreamResponse.json().catch(() => null);
  return { body: redactSensitiveValues(body), status: upstreamResponse.status, ...(rotatedRefreshToken ? { rotatedRefreshToken } : {}) };
}

/** Calls one dedicated Super Admin endpoint using a server-only, short-lived bearer token. */
export async function getSuperAdminJson(path: string): Promise<SuperAdminServerResult> {
  const result = await requestSuperAdminJson(path);
  if (result.status < 200 || result.status >= 300) throw gatewayError(result.status);
  return result;
}

/**
 * Calls an explicitly approved upstream using the dedicated bearer token
 * without exposing that credential to the browser.
 */
export async function requestSuperAdminUpstreamJson(
  upstreamUrl: string,
  init: Pick<RequestInit, "body" | "headers" | "method"> = {},
): Promise<SuperAdminServerResult & { status: number }> {
  const { accessToken, rotatedRefreshToken } = await getSuperAdminAccessToken();

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: init.method,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      body: init.body,
      cache: "no-store",
    });
  } catch {
    throw new SuperAdminServerError(502, "Unable to load enterprise proof data.");
  }

  const body: unknown = await upstreamResponse.json().catch(() => null);
  return { body: redactSensitiveValues(body), status: upstreamResponse.status, ...(rotatedRefreshToken ? { rotatedRefreshToken } : {}) };
}

/** Calls an explicitly approved upstream GET using the dedicated bearer token. */
export function getSuperAdminUpstreamJson(upstreamUrl: string): Promise<SuperAdminServerResult & { status: number }> {
  return requestSuperAdminUpstreamJson(upstreamUrl);
}

/** Builds a no-store BFF response and applies a rotated refresh credential only from the server. */
export function superAdminJsonResponse(result: SuperAdminServerResult & { status?: number }): NextResponse {
  if (result.status === 204) {
    const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    if (result.rotatedRefreshToken) response.cookies.set(SESSION_COOKIE_NAME, result.rotatedRefreshToken, sessionCookieOptions());
    return response;
  }
  const response = NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  if (result.rotatedRefreshToken) response.cookies.set(SESSION_COOKIE_NAME, result.rotatedRefreshToken, sessionCookieOptions());
  return response;
}

/** Converts server-client errors into the dedicated BFF's stable client-safe error contract. */
export function superAdminErrorResponse(error: unknown): NextResponse {
  if (error instanceof SuperAdminServerError) {
    const response = NextResponse.json({ detail: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return error.clearSession ? clearSuperAdminSessionCookie(response) : response;
  }
  return NextResponse.json({ detail: "Unable to load tenant data." }, { status: 502, headers: { "Cache-Control": "no-store" } });
}

/** Revokes the dedicated gateway refresh credential without disclosing it to the browser. */
export async function revokeSuperAdminSession(): Promise<{ revocationConfirmed: boolean; upstreamStatus?: number }> {
  const refreshToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!refreshToken) return { revocationConfirmed: true };
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) return { revocationConfirmed: false };

  try {
    const response = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Token-Delivery": "body" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    const revocationConfirmed = response.ok || response.status === 400 || response.status === 401;
    return revocationConfirmed ? { revocationConfirmed } : { revocationConfirmed, upstreamStatus: response.status };
  } catch {
    return { revocationConfirmed: false };
  }
}

/** Validates that the client supplied only a canonical UUID tenant identifier. */
export function isTenantUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
