import {
  getSuperAdminJson,
  isTenantUuid,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { NextResponse } from "next/server";

type TenantRouteContext = { params: Promise<{ tenantId: string }> };

/** Proxies one canonical-UUID tenant detail request through the server-only session boundary. */
export async function GET(_: Request, { params }: TenantRouteContext) {
  const { tenantId } = await params;
  if (!isTenantUuid(tenantId)) return NextResponse.json({ detail: "A valid tenant UUID is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  try {
    return superAdminJsonResponse(await getSuperAdminJson(`/tenants/${tenantId}`));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
