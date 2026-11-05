import { NextRequest, NextResponse } from "next/server";

import { getSuperAdminUpstreamJson, requestSuperAdminUpstreamJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";
import { resolveMarketplaceUrl } from "@/lib/marketplace-url";

function eventTypesUrl(): URL | null {
  return resolveMarketplaceUrl("/api/v1/event-types/");
}

/** Proxies Event Type reads through the server-only Super Admin session. */
export async function proxyEventTypesRequest(request: NextRequest, eventTypeId?: string): Promise<NextResponse> {
  const url = eventTypesUrl();
  if (!url) return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (eventTypeId) url.pathname = `/api/v1/event-types/${encodeURIComponent(eventTypeId)}`;
  if (!eventTypeId) url.search = "include_inactive=true";
  try {
    if (request.method === "GET") return superAdminJsonResponse(await getSuperAdminUpstreamJson(url.toString()));
    const body = ["POST", "PATCH", "PUT"].includes(request.method) ? await request.text() : undefined;
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString(), { method: request.method, ...(body ? { body } : {}), headers: body ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : undefined }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
