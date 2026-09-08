import {
  isTenantUuid,
  requestSuperAdminJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { NextResponse } from "next/server";

type SuperAdminActionRouteContext = { params: Promise<{ userId: string }> };

/** Activates one canonical-UUID Super Admin through the server-only session boundary. */
export async function POST(_: Request, { params }: SuperAdminActionRouteContext) {
  const { userId } = await params;
  if (!isTenantUuid(userId)) {
    return new NextResponse(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    return superAdminJsonResponse(await requestSuperAdminJson(`/super-admins/${encodeURIComponent(userId)}/activate`, { method: "POST" }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
