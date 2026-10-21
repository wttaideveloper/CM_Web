import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const MODULES = new Set(["training", "event", "product", "service"]);
const REVIEW_ACTIONS = new Set(["pending", "approved", "rejected"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorResponse(status: number, detail: string): NextResponse {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

function marketplaceUrl(path: string, request: NextRequest): URL | null {
  if (!MARKETPLACE_API_BASE_URL) return null;
  try {
    const base = new URL(MARKETPLACE_API_BASE_URL);
    if (base.protocol !== "https:" || base.hostname !== "chat.wisdomtooth.tech") return null;
    const apiBase = /\/api\/v1\/?$/.test(base.pathname) ? base.pathname.replace(/\/$/, "") : `${base.pathname.replace(/\/$/, "")}/api/v1`;
    base.pathname = `${apiBase}/reviews/${path}`;
    base.search = request.nextUrl.search;
    return base;
  } catch {
    return null;
  }
}

function validQueueQuery(request: NextRequest, audit: boolean): boolean {
  const query = request.nextUrl.searchParams;
  const allowed = audit ? ["module", "item_id", "tenant_id"] : ["module", "item_id", "tenant_id", "status", "rating", "q", "page", "page_size"];
  if ([...query.keys()].some((key) => !allowed.includes(key))) return false;
  const moduleParam = query.get("module");
  if (!moduleParam || !MODULES.has(moduleParam)) return false;
  const itemId = query.get("item_id");
  if (itemId && !UUID.test(itemId)) return false;
  const tenantId = query.get("tenant_id");
  if (tenantId && !UUID.test(tenantId)) return false;
  if (!audit) {
    const status = query.get("status");
    if (status && !REVIEW_ACTIONS.has(status)) return false;
    const rating = query.get("rating");
    if (rating && !["1", "2", "3", "4", "5"].includes(rating)) return false;
    for (const key of ["page", "page_size"]) {
      const value = query.get(key);
      if (value && (!/^[1-9]\d*$/.test(value) || Number(value) > 100)) return false;
    }
    if ((query.get("q")?.length ?? 0) > 200) return false;
  }
  return true;
}

/** Routes review queue and moderation requests through the server-only Super Admin session. */
export async function proxyPlatformReviewsRequest(request: NextRequest, path: string[]): Promise<NextResponse> {
  let upstreamPath: string;
  let body: string | undefined;
  const method = request.method;

  if (method === "GET" && path.length === 1 && (path[0] === "manage" || path[0] === "audit")) {
    if (!validQueueQuery(request, path[0] === "audit")) return errorResponse(400, "Invalid review query parameters.");
    upstreamPath = path.join("/");
  } else if (path.length >= 2 && MODULES.has(path[0]) && UUID.test(path[1])) {
    if (method === "DELETE" && path.length === 2) {
      let payload: unknown;
      try { payload = await request.json(); } catch { return errorResponse(400, "A deletion reason is required."); }
      const isCatalogReview = path[0] === "product" || path[0] === "service";
      if (typeof payload !== "object" || payload === null || !("reason" in payload) || typeof payload.reason !== "string" || payload.reason.trim().length < (isCatalogReview ? 3 : 1) || payload.reason.trim().length > (isCatalogReview ? 500 : 1000)) return errorResponse(isCatalogReview ? 422 : 400, isCatalogReview ? "A deletion reason of 3 to 500 characters is required." : "A deletion reason is required (maximum 1000 characters).");
      body = JSON.stringify({ reason: payload.reason.trim() });
      upstreamPath = path.map(encodeURIComponent).join("/");
    } else if (method === "PATCH" && path.length === 3 && path[2] === "moderate") {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return errorResponse(400, "A valid moderation action is required.");
      }
      if (typeof payload !== "object" || payload === null || !("action" in payload) || typeof payload.action !== "string" || !REVIEW_ACTIONS.has(payload.action)) {
        return errorResponse(400, "A valid moderation action is required.");
      }
      const reason = "reason" in payload && typeof payload.reason === "string" ? payload.reason.trim() : "";
      const isCatalogReview = path[0] === "product" || path[0] === "service";
      if (isCatalogReview && (payload.action === "rejected" || payload.action === "pending") && (reason.length < 3 || reason.length > 500)) return errorResponse(422, "A reason of 3 to 500 characters is required for this action.");
      if (payload.action === "rejected" && (!reason || reason.length > 1000)) return errorResponse(400, "A rejection reason is required (maximum 1000 characters).");
      body = JSON.stringify({ action: payload.action, ...(reason ? { reason } : {}) });
      upstreamPath = path.map(encodeURIComponent).join("/");
    } else {
      return errorResponse(404, "Unknown review path.");
    }
  } else {
    return errorResponse(404, "Unknown review path.");
  }

  const url = marketplaceUrl(upstreamPath, request);
  if (!url) return errorResponse(503, "Marketplace API is not configured.");
  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString(), {
      method,
      ...(body ? { body, headers: { "Content-Type": "application/json" } } : {}),
    }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
