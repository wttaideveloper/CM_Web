import { NextResponse } from "next/server";

import {
  getSuperAdminJson,
  superAdminErrorResponse,
} from "@/lib/super-admin-server-client";

type SuperAdminIdentity = {
  id: string;
  isSuperAdmin: boolean;
};

function isIdentity(value: unknown): value is SuperAdminIdentity {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "isSuperAdmin" in value &&
    value.isSuperAdmin === true
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getSuperAdminJson("/auth/me");
    const body = result.body;
    const identity =
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      isIdentity(body.data)
        ? body.data
        : null;

    if (!identity) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { authenticated: true, userId: identity.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
