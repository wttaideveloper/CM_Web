import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const APPROVALS_PATH = new RegExp(`^(pending|${UUID_SEGMENT}(/(approve|reject|publish|request-changes))?)$`, "i");
const ALLOWED_LIST_STATUSES = new Set(["pending_approval", "needs_revision", "approved"]);
const MAX_LIST_PAGE_SIZE = 100;

function marketplaceUrl(pathname: string, search: string): URL | null {
  if (!MARKETPLACE_API_BASE_URL) return null;

  try {
    const url = new URL(MARKETPLACE_API_BASE_URL);
    if (url.protocol !== "https:" || url.hostname !== "chat.wisdomtooth.tech") return null;
    url.pathname = pathname;
    url.search = search;
    return url;
  } catch {
    return null;
  }
}

function invalidPathResponse(): NextResponse {
  return NextResponse.json(
    { detail: "Unknown training approval path." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

function misconfiguredResponse(): NextResponse {
  return NextResponse.json(
    { detail: "Marketplace API is not configured." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

/** Proxies one training-approval read to the marketplace admin API with the Super Admin bearer token. */
export async function proxyTrainingApprovalGet(pathname: string, search: string, segments: string[]): Promise<NextResponse> {
  if (!APPROVALS_PATH.test(segments.join("/"))) return invalidPathResponse();
  const url = marketplaceUrl(pathname, search);
  if (!url) return misconfiguredResponse();

  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

/**
 * Proxies the Training approval-queue LIST read to the marketplace's public list endpoint with
 * the Super Admin bearer token attached. That backend endpoint (`GET /api/v1/trainings`) has no
 * `current_user` dependency — it stays open for the public course catalog — so the security
 * boundary here is this BFF hop itself: only `status`/`page`/`page_size`/`search` are ever
 * forwarded (explicit allowlist, never the raw incoming query string), and the request never
 * reaches the marketplace unless `requestSuperAdminUpstreamJson` first proves a live Super Admin
 * session. A browser can no longer get this data without a valid `ihp_super_admin_refresh` cookie.
 */
export async function proxyTrainingApprovalList(rawSearchParams: URLSearchParams): Promise<NextResponse> {
  const status = rawSearchParams.get("status") ?? "";
  if (!ALLOWED_LIST_STATUSES.has(status)) return invalidPathResponse();

  const pageRaw = rawSearchParams.get("page");
  const page = pageRaw && /^[1-9][0-9]*$/.test(pageRaw) ? pageRaw : "1";

  const pageSizeRaw = rawSearchParams.get("page_size");
  const pageSizeNum = pageSizeRaw && /^[1-9][0-9]*$/.test(pageSizeRaw) ? Number(pageSizeRaw) : 20;
  const pageSize = String(Math.min(pageSizeNum, MAX_LIST_PAGE_SIZE));

  const search = (rawSearchParams.get("search") ?? "").slice(0, 200);

  const forwarded = new URLSearchParams({ status, page, page_size: pageSize });
  if (search) forwarded.set("search", search);

  const url = marketplaceUrl("/api/v1/trainings", forwarded.toString());
  if (!url) return misconfiguredResponse();

  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

/** Proxies one training-approval mutation (approve / reject / publish / request-changes) with the Super Admin bearer token. */
export async function proxyTrainingApprovalMutation(
  request: NextRequest,
  pathname: string,
  segments: string[],
): Promise<NextResponse> {
  if (!APPROVALS_PATH.test(segments.join("/"))) return invalidPathResponse();
  const url = marketplaceUrl(pathname, request.nextUrl.search);
  if (!url) return misconfiguredResponse();

  const method = request.method.toUpperCase();
  const text = method === "GET" || method === "HEAD" ? "" : await request.text();
  const contentType = request.headers.get("content-type");

  try {
    return superAdminJsonResponse(
      await requestSuperAdminUpstreamJson(url.toString(), {
        method: request.method,
        ...(text ? { body: text } : {}),
        ...(text && contentType ? { headers: { "Content-Type": contentType } } : {}),
      }),
    );
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
