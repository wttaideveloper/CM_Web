import { NextResponse, type NextRequest } from "next/server";
import {
  configuredMediaOrigin,
  copyProtectedMediaResponseHeaders,
  isAllowedProtectedMediaUrl,
} from "@ihp/shared";
import {
  requestSuperAdminUpstreamResponse,
  superAdminErrorResponse,
} from "@/lib/super-admin-server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_ORIGIN = configuredMediaOrigin(process.env.CHAT_API_BASE_URL);
const ASSET_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

async function forward(request: NextRequest, assetId: string): Promise<Response> {
  if (!ASSET_ID_PATTERN.test(assetId)) {
    return NextResponse.json({ detail: "Invalid media asset ID." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!MEDIA_ORIGIN) {
    return NextResponse.json({ detail: "Media API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const upstreamUrl = `${MEDIA_ORIGIN}/api/v1/media/${encodeURIComponent(assetId)}/file`;
  if (!isAllowedProtectedMediaUrl(upstreamUrl, MEDIA_ORIGIN)) {
    return NextResponse.json({ detail: "Media URL is not allowed." }, { status: 400, headers: { "Cache-Control": "no-store" } });
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
