import { NextResponse } from "next/server";

import { getSuperAdminUpstreamJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;

function eventTypesUrl(): URL | null {
  if (!MARKETPLACE_API_BASE_URL) return null;
  try {
    const url = new URL(MARKETPLACE_API_BASE_URL);
    if (url.hostname !== "chat.wisdomtooth.tech") return null;
    url.protocol = "https:";
    url.pathname = "/api/v1/event-types/";
    url.search = "";
    return url;
  } catch {
    return null;
  }
}

/** Proxies Event Type reads through the server-only Super Admin session. */
export async function proxyEventTypesRequest(): Promise<NextResponse> {
  const url = eventTypesUrl();
  if (!url) return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(url.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
