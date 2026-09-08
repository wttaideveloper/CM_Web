import { NextRequest, NextResponse } from "next/server";

import {
  getSuperAdminUpstreamJson,
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const eventIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function marketplaceUrl(pathname: string): URL | null {
  if (!MARKETPLACE_API_BASE_URL) return null;

  try {
    const url = new URL(MARKETPLACE_API_BASE_URL);
    if (url.protocol !== "https:" || url.hostname !== "chat.wisdomtooth.tech") return null;
    url.pathname = pathname;
    url.search = "";
    return url;
  } catch {
    return null;
  }
}

/** Validates the UUID identifier used by the Marketplace Event API. */
export function isEventId(value: string): boolean {
  return eventIdPattern.test(value);
}

/** Returns the stable client-safe response for an invalid Event path parameter. */
export function invalidEventIdResponse(): NextResponse {
  return NextResponse.json(
    { detail: "A valid Event identifier is required." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

/** Proxies one read-only Marketplace Event request through the server-only Super Admin session. */
export async function proxyPlatformEventGet(pathname: string, query?: URLSearchParams): Promise<NextResponse> {
  const url = marketplaceUrl(pathname);
  if (!url) {
    return NextResponse.json(
      { detail: "Marketplace API is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (query) url.search = query.toString();

  try {
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(url.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

/** Proxies an existing Event mutation body without exposing bearer credentials to browser code. */
export async function proxyPlatformEventMutation(request: NextRequest, pathname: string): Promise<NextResponse> {
  const url = marketplaceUrl(pathname);
  if (!url) {
    return NextResponse.json(
      { detail: "Marketplace API is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await request.text();
  const contentType = request.headers.get("content-type");

  try {
    return superAdminJsonResponse(
      await requestSuperAdminUpstreamJson(url.toString(), {
        method: request.method,
        ...(body ? { body } : {}),
        ...(contentType ? { headers: { "Content-Type": contentType } } : {}),
      }),
    );
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
