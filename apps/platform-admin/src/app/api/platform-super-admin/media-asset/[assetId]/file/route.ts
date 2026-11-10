import { NextResponse, type NextRequest } from "next/server";
import { copyProtectedMediaResponseHeaders } from "@ihp/shared";
import { resolveMarketplaceUrl } from "@/lib/marketplace-url";
import {
  requestSuperAdminUpstreamResponse,
  superAdminErrorResponse,
} from "@/lib/super-admin-server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

async function forward(request: NextRequest, assetId: string): Promise<Response> {
  if (!ASSET_ID_PATTERN.test(assetId)) {
    return NextResponse.json({ detail: "Invalid media asset ID." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  // Only the trusted, allowlisted Marketplace origin can receive the Super Admin bearer token.
  const upstreamUrl = resolveMarketplaceUrl(`/api/v1/media/${encodeURIComponent(assetId)}/file`)?.toString();
  if (!upstreamUrl) {
    return NextResponse.json({ detail: "Media API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const upstreamResult = await requestSuperAdminUpstreamResponse(upstreamUrl, { method: request.method });
    const headers = copyProtectedMediaResponseHeaders(upstreamResult.response.headers);
    headers.set("Cache-Control", "no-store");
    const response = new NextResponse(request.method === "HEAD" ? null : upstreamResult.response.body, {
      status: upstreamResult.response.status,
      headers,
    });
    if (upstreamResult.rotatedRefreshToken) {
      response.cookies.set("ihp_super_admin_refresh", upstreamResult.rotatedRefreshToken, {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        ...(upstreamResult.rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
      });
    }
    return response;
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

type RouteContext = { params: Promise<{ assetId: string }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { assetId } = await context.params;
  return forward(request, assetId);
}

export async function HEAD(request: NextRequest, context: RouteContext): Promise<Response> {
  const { assetId } = await context.params;
  return forward(request, assetId);
}
