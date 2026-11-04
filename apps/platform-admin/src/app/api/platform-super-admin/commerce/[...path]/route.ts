import { NextResponse } from "next/server";

import {
  requestSuperAdminUpstreamJson,
  requestSuperAdminUpstreamResponse,
  SuperAdminServerError,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { buildPlatformCommerceProxyRequest, isPlatformCommerceReadPath } from "@/lib/platform-commerce-proxy";
import { buildPlatformInvoiceDownloadHeaders, isPlatformInvoiceDownloadPath } from "@/lib/platform-invoice-download";

const CHAT_API_BASE_URL = process.env.CHAT_API_BASE_URL?.replace(/\/+$/, "");

function getChatApiV1Base(): string {
  if (!CHAT_API_BASE_URL) throw new SuperAdminServerError(503, "Commerce API is not configured.");
  return /\/api\/v1\/?$/.test(CHAT_API_BASE_URL) ? CHAT_API_BASE_URL : `${CHAT_API_BASE_URL}/api/v1`;
}

/** Proxies read-only Super Admin Commerce APIs through the existing server-side auth bridge. */
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  if (!isPlatformCommerceReadPath(path)) {
    return NextResponse.json({ detail: "Commerce resource not found." }, { status: 404 });
  }

  try {
    const proxyRequest = buildPlatformCommerceProxyRequest(path, request.url, getChatApiV1Base());
    if (isPlatformInvoiceDownloadPath(path)) {
      const result = await requestSuperAdminUpstreamResponse(proxyRequest.upstreamUrl, proxyRequest.init);
      const headers = buildPlatformInvoiceDownloadHeaders(path[1]!, result.response.headers, result.response.ok);
      if (!headers) {
        await result.response.body?.cancel();
        const errorResponse = NextResponse.json({ detail: "The invoice service did not return a PDF." }, { status: 502, headers: { "Cache-Control": "no-store" } });
        setRotatedRefreshCookie(errorResponse, result.rotatedRefreshToken, result.rememberMe);
        return errorResponse;
      }
      const response = new NextResponse(result.response.body, { status: result.response.status, headers });
      setRotatedRefreshCookie(response, result.rotatedRefreshToken, result.rememberMe);
      return response;
    }
    const result = await requestSuperAdminUpstreamJson(proxyRequest.upstreamUrl, proxyRequest.init);
    return superAdminJsonResponse(result);
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

function setRotatedRefreshCookie(response: NextResponse, rotatedRefreshToken?: string, rememberMe?: boolean): void {
  if (!rotatedRefreshToken) return;
  response.cookies.set("ihp_super_admin_refresh", rotatedRefreshToken, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  if (rememberMe) {
    response.cookies.set("ihp_super_admin_remember_me", "true", {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}
