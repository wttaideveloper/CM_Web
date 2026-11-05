import {
  getSuperAdminUpstreamJson,
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { resolveMarketplaceUrl } from "@/lib/marketplace-url";
import { NextRequest, NextResponse } from "next/server";

/** Proxies the Marketplace Enterprise collection through the dedicated server-only Super Admin session. */
export async function GET() {
  const marketplaceUrl = resolveMarketplaceUrl("/api/v1/enterprises/");
  if (!marketplaceUrl) {
    return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(marketplaceUrl.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const marketplaceUrl = resolveMarketplaceUrl("/api/v1/enterprises/");
  if (!marketplaceUrl) {
    return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const body = await request.text();
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(marketplaceUrl.toString(), { method: "POST", ...(body ? { body } : {}), headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" } }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
