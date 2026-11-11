import { NextResponse, type NextRequest } from "next/server";
import {
  buildProtectedMediaRequestHeaders,
  configuredMediaOrigin,
  copyProtectedMediaResponseHeaders,
  isAllowedProtectedMediaUrl,
  resolveAllowedBlogMediaUrl,
  resolveAllowedEventMediaUrl,
} from "@ihp/shared";
import {
  requestSuperAdminUpstreamResponse,
  superAdminErrorResponse,
} from "@/lib/super-admin-server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_PROXY_ORIGIN = configuredMediaOrigin(process.env.CHAT_API_BASE_URL, { allowLocalhost: true }) ?? "https://chat.wisdomtooth.tech";

async function forward(request: NextRequest): Promise<Response> {
  const requestedUrl = request.nextUrl.searchParams.get("url")?.trim();
  const upstreamUrl = requestedUrl
    ? resolveAllowedEventMediaUrl(requestedUrl, MEDIA_PROXY_ORIGIN)
      ?? resolveAllowedBlogMediaUrl(requestedUrl, MEDIA_PROXY_ORIGIN)
      ?? (isAllowedProtectedMediaUrl(requestedUrl, MEDIA_PROXY_ORIGIN) ? requestedUrl : null)
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
