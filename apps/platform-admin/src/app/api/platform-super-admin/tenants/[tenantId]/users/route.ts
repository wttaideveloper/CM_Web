import {
  getSuperAdminJson,
  isTenantUuid,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { NextResponse } from "next/server";

type TenantUsersRouteContext = { params: Promise<{ tenantId: string }> };

/** Proxies one canonical-UUID tenant-user list request through the server-only session boundary. */
export async function GET(_: Request, { params }: TenantUsersRouteContext) {
  const { tenantId } = await params;
  if (!isTenantUuid(tenantId)) return NextResponse.json({ detail: "A valid tenant UUID is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  try {
    return superAdminJsonResponse(await getSuperAdminJson(`/tenants/${tenantId}/users`));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
