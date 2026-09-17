import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const APPROVALS_PATH = new RegExp(`^(pending|${UUID_SEGMENT}(/(approve|reject|publish|request-changes))?)$`, "i");

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
