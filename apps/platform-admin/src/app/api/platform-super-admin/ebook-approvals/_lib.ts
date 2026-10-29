import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const MAX_PAGE_SIZE = 100;
const ID_SEGMENT = /^[A-Za-z0-9_-]{1,200}$/;

function marketplaceUrl(pathname: string, search = ""): URL | null {
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

function errorResponse(status: number, detail: string): NextResponse {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

function invalidResponse(): NextResponse {
  return errorResponse(400, "Invalid eBook approval request.");
}

function parsePositiveInt(value: string | null, fallback: number, maximum: number): number {
  if (!value || !/^[1-9][0-9]*$/.test(value)) return fallback;
  return Math.min(Number(value), maximum);
}

export async function getPendingEbooks(searchParams: URLSearchParams): Promise<NextResponse> {
  const page = parsePositiveInt(searchParams.get("page"), 1, Number.MAX_SAFE_INTEGER);
  const pageSize = parsePositiveInt(searchParams.get("page_size"), 20, MAX_PAGE_SIZE);
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const url = marketplaceUrl("/api/v1/admin/ebooks/pending", query.toString());
  if (!url) return errorResponse(503, "Marketplace API is not configured.");
  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

export async function proxyEbookApproval(request: NextRequest, path: string[]): Promise<NextResponse> {
  const isPendingList = path.length === 1 && path[0] === "pending" && request.method === "GET";
  if (isPendingList) return getPendingEbooks(request.nextUrl.searchParams);

  const hasValidIds = path.length >= 3 && path.slice(0, 3).every((segment) => ID_SEGMENT.test(segment));
  const isReviewRead = path.length === 3 && request.method === "GET";
  const isReviewDecision = path.length === 4 && path[3] === "review" && request.method === "POST";
  const isPublish = path.length === 4 && path[3] === "publish" && request.method === "POST";
  if (!hasValidIds || !(isReviewRead || isReviewDecision || isPublish)) return invalidResponse();

  let requestBody = "";
  if (request.method === "POST") {
    let value: unknown;
    try {
      const rawBody = await request.text();
      value = rawBody ? JSON.parse(rawBody) as unknown : {};
    } catch {
      return invalidResponse();
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalidResponse();
    const body = value as Record<string, unknown>;
    if (isReviewDecision) {
      if (body.action === "request_changes") {
        if (typeof body.note !== "string" || body.note.trim().length < 3 || body.note.trim().length > 1000) return errorResponse(422, "Tell the author what to change (at least 3 characters, no more than 1000).");
      } else if (body.action === "approve") {
        if (typeof body.publish !== "boolean") return invalidResponse();
        if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 1000)) return invalidResponse();
      } else {
        return invalidResponse();
      }
    } else if (Object.keys(body).length > 0) {
      return invalidResponse();
    }
    requestBody = JSON.stringify(body);
  }

  const [trainingId, sectionId, lessonId] = path;
  const ebookPath = `/api/v1/trainings/${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/ebook`;
  const adminEbookPath = `/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/ebook`;
  const upstreamPath = isPublish ? `${ebookPath}/publish` : isReviewRead ? adminEbookPath : `${adminEbookPath}/review`;
  const url = marketplaceUrl(upstreamPath, isReviewRead ? request.nextUrl.search : "");
  if (!url) return errorResponse(503, "Marketplace API is not configured.");

  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString(), {
      method: request.method,
      ...(requestBody ? { body: requestBody, headers: { "Content-Type": "application/json" } } : {}),
    }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
