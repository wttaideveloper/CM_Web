import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "ihp_super_admin_refresh";
const REMEMBER_ME_COOKIE_NAME = "ihp_super_admin_remember_me";
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCookieDomain(): string | undefined {
  const configuredDomain = process.env.SUPER_ADMIN_SESSION_COOKIE_DOMAIN?.trim().toLowerCase();
  if (!configuredDomain || configuredDomain === "localhost" || configuredDomain === "127.0.0.1") return undefined;
  if (!/^[a-z0-9.-]+$/.test(configuredDomain)) return undefined;
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

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const refreshToken = isRecord(body) && typeof body.refreshToken === "string"
    ? body.refreshToken.trim()
    : null;
  const rememberMe = Boolean(isRecord(body) && body.rememberMe === true);

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  if (refreshToken) {
    response.cookies.set(SESSION_COOKIE_NAME, refreshToken, sessionCookieOptions(rememberMe));
    if (rememberMe) {
      response.cookies.set(REMEMBER_ME_COOKIE_NAME, "true", sessionCookieOptions(true));
    }
  }

  return response;
}
