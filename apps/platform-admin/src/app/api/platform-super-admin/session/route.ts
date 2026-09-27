import { NextResponse } from "next/server";

import {
  clearSuperAdminSessionCookie,
  requestSuperAdminJson,
  SuperAdminServerError,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function safeIdentity(value: unknown): Record<string, unknown> | null { if (!isRecord(value)) return null; const fields = ["id", "email", "fullName", "name", "username", "isSuperAdmin", "status", "emailVerified", "keycloakId", "createdAt"] as const; const identity = Object.fromEntries(fields.filter((field) => field in value).map((field) => [field, value[field]])); return typeof identity.id === "string" && identity.isSuperAdmin === true ? identity : null; }

export async function GET(): Promise<NextResponse> {
  try {
    const result = await requestSuperAdminJson("/auth/me");
    const identity = safeIdentity(isRecord(result.body) ? result.body.data : null);
    if (result.status < 200 || result.status >= 300 || !identity) { const response = NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } }); return result.rotatedRefreshToken ? superAdminJsonResponse({ body: { authenticated: false }, status: 401, rotatedRefreshToken: result.rotatedRefreshToken }) : response; }
    return superAdminJsonResponse({ body: { authenticated: true, user: identity, userId: identity.id }, status: 200, rotatedRefreshToken: result.rotatedRefreshToken });
  } catch (error) {
    if (error instanceof SuperAdminServerError && error.status === 401) {
      const response = NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
      return error.clearSession ? clearSuperAdminSessionCookie(response) : response;
    }
    return NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
