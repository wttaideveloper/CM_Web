import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const categoryIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function eventCategoryUrl(categoryId?: string): URL | null {
  if (!MARKETPLACE_API_BASE_URL) return null;
  try {
    const url = new URL(MARKETPLACE_API_BASE_URL);
    if (url.protocol !== "https:" || url.hostname !== "chat.wisdomtooth.tech") return null;
    url.pathname = categoryId ? `/api/v1/event-categories/${encodeURIComponent(categoryId)}` : "/api/v1/event-categories/";
    url.search = "";
    return url;
  } catch {
    return null;
  }
}

/** Validates the backend-owned Event Category UUID path parameter. */
export function isEventCategoryId(value: string): boolean {
  return categoryIdPattern.test(value);
}

export function invalidEventCategoryIdResponse(): NextResponse {
  return NextResponse.json({ detail: "A valid Event Category identifier is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

/** Proxies Event taxonomy reads and mutations through the existing server-only Super Admin session. */
export async function proxyEventCategoryRequest(request: NextRequest, categoryId?: string): Promise<NextResponse> {
  const url = eventCategoryUrl(categoryId);
  if (!url) return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const body = request.method === "GET" || request.method === "DELETE" ? undefined : await request.text();
  const contentType = request.headers.get("content-type");
  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString(), {
      method: request.method,
      ...(body ? { body } : {}),
      ...(contentType ? { headers: { "Content-Type": contentType } } : {}),
    }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
