import { NextResponse, type NextRequest } from "next/server";
import {
  buildProtectedMediaRequestHeaders,
  configuredMediaOrigin,
  copyProtectedMediaResponseHeaders,
  resolveProtectedMediaFetchUrl,
} from "@ihp/shared";
import { resolveMarketplaceOrigin } from "@/lib/marketplace-url";
import {
  requestSuperAdminUpstreamResponse,
  superAdminErrorResponse,
} from "@/lib/super-admin-server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function forward(request: NextRequest): Promise<Response> {
  const requestedUrl = request.nextUrl.searchParams.get("url")?.trim();
  // The URL the browser holds carries the public media origin; the connection is made to
  // the trusted internal origin, never to a host taken from the request.
  const upstreamUrl = requestedUrl
    ? resolveProtectedMediaFetchUrl(requestedUrl, {
        publicOrigin: configuredMediaOrigin(process.env.NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN),
        internalOrigin: resolveMarketplaceOrigin(),
      })
    : null;
  if (!upstreamUrl) {
    return NextResponse.json({ detail: "Media URL is not allowed." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const upstreamResult = await requestSuperAdminUpstreamResponse(upstreamUrl, {
      method: request.method,
      headers: buildProtectedMediaRequestHeaders(request.headers),
    });
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

export function GET(request: NextRequest): Promise<Response> {
  return forward(request);
}

export function HEAD(request: NextRequest): Promise<Response> {
  return forward(request);
}
