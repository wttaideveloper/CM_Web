import { NextRequest, NextResponse } from "next/server";

import {
  getSuperAdminUpstreamJson,
  isTenantUuid,
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { resolveMarketplaceUrl } from "@/lib/marketplace-url";

type RouteContext = { params: Promise<{ enterpriseId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { enterpriseId } = await context.params;
  if (!isTenantUuid(enterpriseId)) {
    return NextResponse.json(
      { detail: "A valid enterprise identifier is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const marketplaceUrl = resolveMarketplaceUrl(`/api/v1/enterprises/${enterpriseId}`);
  if (!marketplaceUrl) {
    return NextResponse.json(
      { detail: "Marketplace API is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(marketplaceUrl.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { enterpriseId } = await context.params;
  if (!isTenantUuid(enterpriseId)) return NextResponse.json({ detail: "A valid enterprise identifier is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const marketplaceUrl = resolveMarketplaceUrl(`/api/v1/enterprises/${enterpriseId}`);
  if (!marketplaceUrl) return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  try {
    const body = await request.text();
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(marketplaceUrl.toString(), { method: "PUT", ...(body ? { body } : {}), headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" } }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
