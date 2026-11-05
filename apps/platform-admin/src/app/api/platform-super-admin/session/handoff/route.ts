import { NextResponse } from "next/server";
import { warmSuperAdminSession } from "@/lib/super-admin-server-client";

const SESSION_COOKIE_NAME = "ihp_super_admin_refresh";
const REMEMBER_ME_COOKIE_NAME = "ihp_super_admin_remember_me";
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

function getCookieDomain(): string | undefined {
  const configuredDomain = process.env.SUPER_ADMIN_SESSION_COOKIE_DOMAIN?.trim().toLowerCase();
  if (!configuredDomain || configuredDomain === "localhost" || configuredDomain === "127.0.0.1") return undefined;
  if (!/^[a-z0-9.-]+$/.test(configuredDomain)) return undefined;
  return configuredDomain;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const returnTo = url.searchParams.get("return_to")?.trim() || "/dashboard";
  const rememberMe = url.searchParams.get("rememberMe") === "true";

  // Ensure returnTo is a relative path to prevent open redirects
  const safePath = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
  const targetUrl = new URL(safePath, request.url);

  const response = NextResponse.redirect(targetUrl, { status: 302 });

  if (token) {
    await warmSuperAdminSession(token, rememberMe).catch(() => undefined);
    const domain = getCookieDomain();
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
      ...(domain ? { domain } : {}),
    });

    if (rememberMe) {
      response.cookies.set(REMEMBER_ME_COOKIE_NAME, "true", {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: REMEMBER_ME_MAX_AGE,
        ...(domain ? { domain } : {}),
      });
    }
  }

  return response;
}
