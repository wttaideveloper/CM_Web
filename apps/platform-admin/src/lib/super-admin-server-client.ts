import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { normalizeUpstreamBaseUrl } from "@ihp/shared/upstream-config";

import { resolveMarketplaceUrl } from "./marketplace-url";

const SESSION_COOKIE_NAME = "ihp_super_admin_refresh";
const ACCESS_TOKEN_COOKIE_NAME = "access_token";
const REMEMBER_ME_COOKIE_NAME = "ihp_super_admin_remember_me";
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;
// An unset or malformed value leaves the gateway "not configured" (503) instead of guessing a host.
const SUPER_ADMIN_AUTH_API_BASE_URL = normalizeUpstreamBaseUrl(process.env.SUPER_ADMIN_AUTH_API_BASE_URL) ?? undefined;

// Handbook §4: every outbound call has an explicit timeout shorter than the caller's budget.
const JSON_UPSTREAM_TIMEOUT_MS = boundedTimeoutMs(process.env.SUPER_ADMIN_UPSTREAM_TIMEOUT_MS, 15_000);
const MEDIA_UPSTREAM_TIMEOUT_MS = boundedTimeoutMs(process.env.SUPER_ADMIN_MEDIA_TIMEOUT_MS, 30_000);

function boundedTimeoutMs(configured: string | undefined, fallbackMs: number): number {
  const value = Number(configured);
  return Number.isInteger(value) && value >= 1_000 && value <= 120_000 ? value : fallbackMs;
}

/**
 * Starts a fetch that is aborted if response *headers* have not arrived in time. The timer
 * stops once headers arrive, so a large media body that is still streaming is not truncated.
 */
async function fetchUntilHeaders(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type SuperAdminAccessToken = { accessToken: string; rotatedRefreshToken?: string; rememberMe: boolean };

type CachedAccessToken = {
  accessToken: string;
  rotatedRefreshToken?: string;
  rememberMe: boolean;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedAccessToken>();
const refreshInFlight = new Map<string, Promise<SuperAdminAccessToken>>();
const ACCESS_TOKEN_TTL_MS = 4 * 60 * 1000; // 4 minutes
const ROTATION_GRACE_MS = 60 * 1000; // 60 seconds grace period

/** Error returned by the dedicated Super Admin gateway after server-side normalization. */
export class SuperAdminServerError extends Error {
  constructor(readonly status: number, message: string, readonly clearSession = false) {
    super(message);
    this.name = "SuperAdminServerError";
  }
}

/** Successful dedicated gateway result, including an optional rotated refresh credential. */
export type SuperAdminServerResult = { body: unknown; rotatedRefreshToken?: string; rememberMe?: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCookieDomain(): string | undefined {
  const configuredDomain = process.env.SUPER_ADMIN_SESSION_COOKIE_DOMAIN?.trim().toLowerCase();
  if (!configuredDomain || configuredDomain === "localhost" || configuredDomain === "127.0.0.1") return undefined;
  if (!/^[a-z0-9.-]+$/.test(configuredDomain)) throw new SuperAdminServerError(503, "Super Admin authentication is not configured.");
  return configuredDomain;
}

function sessionCookieOptions(rememberMe = false) {
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

/** Clears the Platform bridge credential using the same scope used when it was issued. */
export function clearSuperAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  response.cookies.set(REMEMBER_ME_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveValues);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["accessToken", "access_token", "refreshToken", "refresh_token", "authorization"].includes(key))
    .map(([key, nestedValue]) => [key, redactSensitiveValues(nestedValue)]));
}

function safeUpstreamDetail(body: unknown): string {
  if (!isRecord(body)) return "Upstream request failed.";
  const detail = body.detail ?? body.message;
  if (typeof detail !== "string" || !detail.trim()) return "Upstream request failed.";
  return detail.replace(/bearer\s+[a-z0-9._-]+/gi, "[redacted]").slice(0, 500);
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

async function refreshSuperAdminAccessToken(refreshToken: string, rememberMe: boolean): Promise<SuperAdminAccessToken> {
  let refreshResponse: Response;
  try {
    refreshResponse = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `refresh_token=${refreshToken}`,
      },
      body: JSON.stringify({ refreshToken, refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(JSON_UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new SuperAdminServerError(502, "Unable to load tenant data.");
  }

  const refreshBody: unknown = await refreshResponse.json().catch(() => null);
  const refreshTokens = isRecord(refreshBody) && isRecord(refreshBody.tokens) ? refreshBody.tokens : null;
  const accessToken = refreshTokens && typeof refreshTokens.accessToken === "string"
    ? refreshTokens.accessToken
    : refreshTokens && typeof refreshTokens.access_token === "string"
      ? refreshTokens.access_token
      : null;
  const rotatedRefreshToken = refreshTokens && typeof refreshTokens.refreshToken === "string"
    ? refreshTokens.refreshToken
    : refreshTokens && typeof refreshTokens.refresh_token === "string"
      ? refreshTokens.refresh_token
      : undefined;
  if (!refreshResponse.ok || !accessToken) {
    throw refreshFailure(refreshResponse.status);
  }
  return {
    accessToken,
    rememberMe,
    ...(rotatedRefreshToken ? { rotatedRefreshToken } : {}),
  };
}

/** Pre-populates the memory cache during SSO session handoff. */
export async function warmSuperAdminSession(refreshToken: string, rememberMe: boolean): Promise<void> {
  const refreshKey = createHash("sha256").update(refreshToken).digest("hex");
  const existing = tokenCache.get(refreshKey);
  if (existing && Date.now() < existing.expiresAt) return;

  try {
    const result = await refreshSuperAdminAccessToken(refreshToken, rememberMe);
    const cachedEntry: CachedAccessToken = {
      accessToken: result.accessToken,
      rotatedRefreshToken: result.rotatedRefreshToken,
      rememberMe: result.rememberMe,
      expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
    };
    tokenCache.set(refreshKey, cachedEntry);
    if (result.rotatedRefreshToken) {
      const newKey = createHash("sha256").update(result.rotatedRefreshToken).digest("hex");
      tokenCache.set(newKey, cachedEntry);
      setTimeout(() => {
        if (tokenCache.get(refreshKey) === cachedEntry) tokenCache.delete(refreshKey);
      }, ROTATION_GRACE_MS);
    }
  } catch {
    // If warm-up encounters an error, on-demand getSuperAdminAccessToken will handle it
  }
}

/** Obtains the short-lived dedicated access token without exposing it outside this server module. */
async function getSuperAdminAccessToken(): Promise<SuperAdminAccessToken> {
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) throw new SuperAdminServerError(503, "Super Admin authentication is not configured.");
  const requestCookies = await cookies();
  const accessToken = requestCookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const rememberMe = requestCookies.get(REMEMBER_ME_COOKIE_NAME)?.value === "true";
  if (accessToken) {
    return { accessToken, rememberMe };
  }

  const refreshToken =
    requestCookies.get(SESSION_COOKIE_NAME)?.value ||
    requestCookies.get("refresh_token")?.value ||
    requestCookies.get("ihp_refresh_token")?.value;
  if (!refreshToken) throw new SuperAdminServerError(401, "Super Admin authentication is required.");
  const refreshKey = createHash("sha256").update(refreshToken).digest("hex");

  // 1. Check in-memory cache for a valid active access token
  const cached = tokenCache.get(refreshKey);
  if (cached && Date.now() < cached.expiresAt) {
    return {
      accessToken: cached.accessToken,
      rotatedRefreshToken: cached.rotatedRefreshToken,
      rememberMe: cached.rememberMe,
    };
  }

  // 2. Coalesce in-flight refresh requests to avoid concurrent refresh collisions
  const existing = refreshInFlight.get(refreshKey);
  if (existing) return existing;

  // 3. Initiate refresh and cache active access token
  const refreshPromise = (async () => {
    try {
      const result = await refreshSuperAdminAccessToken(refreshToken, rememberMe);
      const cachedEntry: CachedAccessToken = {
        accessToken: result.accessToken,
        rotatedRefreshToken: result.rotatedRefreshToken,
        rememberMe: result.rememberMe,
        expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
      };

      tokenCache.set(refreshKey, cachedEntry);
      if (result.rotatedRefreshToken) {
        const newKey = createHash("sha256").update(result.rotatedRefreshToken).digest("hex");
        tokenCache.set(newKey, cachedEntry);
        setTimeout(() => {
          if (tokenCache.get(refreshKey) === cachedEntry) tokenCache.delete(refreshKey);
        }, ROTATION_GRACE_MS);
      }
      return result;
    } finally {
      refreshInFlight.delete(refreshKey);
    }
  })();

  refreshInFlight.set(refreshKey, refreshPromise);
  return refreshPromise;
}

/** Calls a dedicated Super Admin endpoint with a server-only bearer token and preserves its HTTP result. */
export async function requestSuperAdminJson(
  path: string,
  init: Pick<RequestInit, "body" | "headers" | "method"> = {},
): Promise<SuperAdminServerResult & { status: number }> {
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) throw new SuperAdminServerError(503, "Super Admin authentication is not configured.");
  const { accessToken, rotatedRefreshToken, rememberMe } = await getSuperAdminAccessToken();

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1${path}`, {
      method: init.method,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      body: init.body,
      cache: "no-store",
      signal: AbortSignal.timeout(JSON_UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new SuperAdminServerError(502, "Unable to load tenant data.");
  }

  const body: unknown = await upstreamResponse.json().catch(() => null);
  return { body: redactSensitiveValues(body), status: upstreamResponse.status, rememberMe, ...(rotatedRefreshToken ? { rotatedRefreshToken } : {}) };
}

/** Calls one dedicated Super Admin endpoint using a server-only, short-lived bearer token. */
export async function getSuperAdminJson(path: string): Promise<SuperAdminServerResult> {
  const result = await requestSuperAdminJson(path);
  if (result.status < 200 || result.status >= 300) throw gatewayError(result.status);
  return result;
}

/** Calls the workflow notification upstream while preserving only its safe error detail for the notification BFF. */
export async function getSuperAdminWorkflowJson(
  path: string,
  init: Pick<RequestInit, "body" | "headers" | "method"> = {},
): Promise<SuperAdminServerResult & { status: number }> {
  // `path` may carry a query string; split it so the trusted-origin helper owns the final URL.
  const queryStart = path.indexOf("?");
  const apiPath = queryStart === -1 ? path : path.slice(0, queryStart);
  const search = queryStart === -1 ? "" : path.slice(queryStart);
  const upstreamUrl = resolveMarketplaceUrl(`/api/v1${apiPath}`, search);
  if (!upstreamUrl) throw new SuperAdminServerError(503, "Chat API is not configured.");
  const result = await requestSuperAdminUpstreamJson(upstreamUrl.toString(), init);
  if (result.status < 200 || result.status >= 300) {
    // Log the route and status only: the full URL carries query parameters and the
    // upstream detail text can echo user input, neither of which belongs in logs.
    console.error("Platform workflow notification upstream failure", { path: apiPath, status: result.status });
  }
  return result;
}

/** Builds the notification-only error contract without exposing credentials or response headers. */
export function superAdminWorkflowErrorResponse(result: SuperAdminServerResult & { status: number }): NextResponse;
export function superAdminWorkflowErrorResponse(error: unknown): NextResponse;
export function superAdminWorkflowErrorResponse(resultOrError: (SuperAdminServerResult & { status: number }) | unknown): NextResponse {
  if (!(resultOrError instanceof Object) || !("status" in resultOrError) || typeof resultOrError.status !== "number" || !("body" in resultOrError)) {
    const status = resultOrError instanceof SuperAdminServerError ? resultOrError.status : 502;
    const detail = resultOrError instanceof SuperAdminServerError && resultOrError.status === 503 ? resultOrError.message : "Unable to load workflow notifications.";
    return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
  }
  const result = resultOrError as SuperAdminServerResult & { status: number };
  return superAdminJsonResponse({
    body: {
      detail: "Unable to load workflow notifications.",
      upstream_status: result.status,
      upstream_detail: safeUpstreamDetail(result.body),
    },
    status: result.status,
    ...(result.rotatedRefreshToken ? { rotatedRefreshToken: result.rotatedRefreshToken } : {}),
    ...(result.rememberMe !== undefined ? { rememberMe: result.rememberMe } : {}),
  });
}

/**
 * Calls an explicitly approved upstream using the dedicated bearer token
 * without exposing that credential to the browser.
 */
export async function requestSuperAdminUpstreamJson(
  upstreamUrl: string,
  init: Pick<RequestInit, "body" | "headers" | "method"> = {},
): Promise<SuperAdminServerResult & { status: number }> {
  const { accessToken, rotatedRefreshToken, rememberMe } = await getSuperAdminAccessToken();

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: init.method,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      body: init.body,
      cache: "no-store",
      signal: AbortSignal.timeout(JSON_UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new SuperAdminServerError(502, "Unable to load enterprise proof data.");
  }

  const body: unknown = await upstreamResponse.json().catch(() => null);
  return { body: redactSensitiveValues(body), status: upstreamResponse.status, rememberMe, ...(rotatedRefreshToken ? { rotatedRefreshToken } : {}) };
}

/** Calls an explicitly approved upstream GET using the dedicated bearer token. */
export function getSuperAdminUpstreamJson(upstreamUrl: string): Promise<SuperAdminServerResult & { status: number }> {
  return requestSuperAdminUpstreamJson(upstreamUrl);
}

/** Fetches a protected non-JSON resource with the same server-only Super Admin credential. */
export async function requestSuperAdminUpstreamResponse(
  upstreamUrl: string,
  init: Pick<RequestInit, "headers" | "method"> = {},
): Promise<{ response: Response; rotatedRefreshToken?: string; rememberMe: boolean }> {
  const { accessToken, rotatedRefreshToken, rememberMe } = await getSuperAdminAccessToken();
  try {
    const response = await fetchUntilHeaders(upstreamUrl, {
      method: init.method,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      redirect: "manual",
    }, MEDIA_UPSTREAM_TIMEOUT_MS);
    return { response, rememberMe, ...(rotatedRefreshToken ? { rotatedRefreshToken } : {}) };
  } catch {
    throw new SuperAdminServerError(502, "Unable to load event media.");
  }
}

/** Applies a rotated server-side session credential to any BFF response type. */
export function applyRotatedSuperAdminSession(
  response: NextResponse,
  rotatedRefreshToken: string | undefined,
  rememberMe: boolean,
): NextResponse {
  if (rotatedRefreshToken) {
    response.cookies.set(SESSION_COOKIE_NAME, rotatedRefreshToken, sessionCookieOptions(rememberMe));
    if (rememberMe) response.cookies.set(REMEMBER_ME_COOKIE_NAME, "true", sessionCookieOptions(true));
  }
  return response;
}


/** Builds a no-store BFF response and applies a rotated refresh credential only from the server. */
export function superAdminJsonResponse(result: SuperAdminServerResult & { status?: number }): NextResponse {
  if (result.status === 204) {
    const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return applyRotatedSuperAdminSession(response, result.rotatedRefreshToken, Boolean(result.rememberMe));
  }
  const response = NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  return applyRotatedSuperAdminSession(response, result.rotatedRefreshToken, Boolean(result.rememberMe));
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
  tokenCache.clear();
  refreshInFlight.clear();
  const refreshToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!refreshToken) return { revocationConfirmed: true };
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) return { revocationConfirmed: false };

  try {
    const response = await fetch(`${SUPER_ADMIN_AUTH_API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `refresh_token=${refreshToken}`,
      },
      body: JSON.stringify({ refreshToken, refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(JSON_UPSTREAM_TIMEOUT_MS),
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
