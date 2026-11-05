import { NextResponse } from "next/server";

import {
  clearSuperAdminSessionCookie,
  requestSuperAdminJson,
  SuperAdminServerError,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSuperAdminUser(value: Record<string, unknown>): boolean {
  if (value.isSuperAdmin === true || value.is_super_admin === true) return true;
  if (value.role === "super_admin" || value.user_role === "super_admin") return true;
  if (isRecord(value.roles)) {
    if (value.roles.role === "super_admin" || value.roles.userRole === "super_admin" || value.roles.user_role === "super_admin") return true;
  }
  if (Array.isArray(value.groups) && (value.groups.includes("super_admin") || value.groups.includes("super-admin") || value.groups.includes("admin"))) return true;
  if (Array.isArray(value.roles) && (value.roles.includes("super_admin") || value.roles.includes("super-admin") || value.roles.includes("admin"))) return true;
  const tempAdminId = process.env.NEXT_PUBLIC_TEMP_PLATFORM_WORKFLOW_ADMIN_USER_ID?.trim();
  if (tempAdminId && (value.id === tempAdminId || value.userId === tempAdminId || value.keycloakId === tempAdminId)) return true;
  return false;
}

function safeIdentity(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (!isSuperAdminUser(value)) return null;
  const fields = ["id", "userId", "user_id", "sub", "email", "fullName", "full_name", "displayName", "display_name", "firstName", "first_name", "lastName", "last_name", "name", "username", "isSuperAdmin", "status", "emailVerified", "email_verified", "keycloakId", "createdAt", "created_at"] as const;
  const identity = Object.fromEntries(fields.filter((field) => field in value).map((field) => [field, value[field]]));
  const id = [value.id, value.userId, value.user_id, value.sub, value.keycloakId, value.keycloak_id]
    .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
  if (id) identity.id = id.trim();
  identity.isSuperAdmin = true;
  if (typeof identity.emailVerified !== "boolean" && typeof identity.email_verified === "boolean") identity.emailVerified = identity.email_verified;
  if (typeof identity.createdAt !== "string" && typeof identity.created_at === "string") identity.createdAt = identity.created_at;
  const fullName = [value.fullName, value.full_name, value.displayName, value.display_name, value.name]
    .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
  if (typeof fullName === "string") identity.fullName = fullName.trim();
  else {
    const firstName = [value.firstName, value.first_name].find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
    const lastName = [value.lastName, value.last_name].find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
    if (firstName || lastName) identity.fullName = [firstName, lastName].filter((part): part is string => typeof part === "string").map((part) => part.trim()).filter(Boolean).join(" ");
  }
  return typeof identity.id === "string" && identity.id.length > 0 ? identity : null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const result = await requestSuperAdminJson("/auth/me");
    const bodyData = isRecord(result.body) ? (isRecord(result.body.data) ? result.body.data : result.body) : null;
    const identity = safeIdentity(bodyData);
    if (result.status === 401 || result.status === 403) {
      return clearSuperAdminSessionCookie(NextResponse.json(
        { authenticated: false },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ));
    }
    if (result.status < 200 || result.status >= 300) {
      return superAdminJsonResponse({
        body: { detail: "Unable to verify the Super Admin session." },
        status: result.status >= 500 ? 502 : result.status,
        rotatedRefreshToken: result.rotatedRefreshToken,
      });
    }
    if (!identity) {
      return clearSuperAdminSessionCookie(NextResponse.json(
        { authenticated: false, detail: "Super Admin authentication required." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ));
    }
    return superAdminJsonResponse({ body: { authenticated: true, user: identity, userId: identity.id }, status: 200, rotatedRefreshToken: result.rotatedRefreshToken });
  } catch (error) {
    if (error instanceof SuperAdminServerError && error.status === 401) {
      const response = NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
      return error.clearSession ? clearSuperAdminSessionCookie(response) : response;
    }
    return superAdminErrorResponse(error);
  }
}
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const refreshToken = body && typeof body === "object" && "refreshToken" in body && typeof (body as Record<string, unknown>).refreshToken === "string"
    ? ((body as Record<string, unknown>).refreshToken as string).trim()
    : null;
  const rememberMe = body && typeof body === "object" && "rememberMe" in body && (body as Record<string, unknown>).rememberMe === true;

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  if (refreshToken) {
    const configuredDomain = process.env.SUPER_ADMIN_SESSION_COOKIE_DOMAIN?.trim().toLowerCase();
    const domain = configuredDomain && /^[a-z0-9.-]+$/.test(configuredDomain) ? configuredDomain : undefined;
    response.cookies.set("ihp_super_admin_refresh", refreshToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
      ...(domain ? { domain } : {}),
    });
  }

  return response;
}
