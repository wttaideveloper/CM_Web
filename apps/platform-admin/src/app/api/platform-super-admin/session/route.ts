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

function safeIdentity(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const fields = ["id", "email", "fullName", "full_name", "displayName", "display_name", "firstName", "first_name", "lastName", "last_name", "name", "username", "isSuperAdmin", "status", "emailVerified", "email_verified", "keycloakId", "createdAt", "created_at"] as const;
  const identity = Object.fromEntries(fields.filter((field) => field in value).map((field) => [field, value[field]]));
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
  return typeof identity.id === "string" && identity.isSuperAdmin === true ? identity : null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const result = await requestSuperAdminJson("/auth/me");
    const identity = safeIdentity(isRecord(result.body) ? result.body.data : null);
    if (result.status === 401) {
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
      return NextResponse.json(
        { detail: "Super Admin authentication returned an unsupported identity." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
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
