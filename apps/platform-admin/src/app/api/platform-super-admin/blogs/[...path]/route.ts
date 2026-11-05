import { NextRequest, NextResponse } from "next/server";

import {
  applyRotatedSuperAdminSession,
  requestSuperAdminUpstreamJson,
  requestSuperAdminUpstreamResponse,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAT_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const BLOGS_PREFIX = ["cms", "blogs"];

type RouteContext = { params: Promise<{ path: string[] }> };

function upstreamUrl(path: readonly string[], search: string): URL | null {
  if (!CHAT_API_BASE_URL || path.length < BLOGS_PREFIX.length) return null;
  if (path[0] !== BLOGS_PREFIX[0] || path[1] !== BLOGS_PREFIX[1]) return null;

  try {
    const url = new URL(CHAT_API_BASE_URL);
    url.pathname = `/api/v1/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;
    url.search = search;
    return url;
  } catch {
    return null;
  }
}

function invalidPathResponse(): NextResponse {
  return NextResponse.json(
    { detail: "Unknown Blogs and News path." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

async function proxy(
  request: NextRequest,
  path: readonly string[],
): Promise<NextResponse> {
  const url = upstreamUrl(path, request.nextUrl.search);
  if (!url) return invalidPathResponse();

  // Uploaded images/documents are protected binary resources. Do not parse
  // them as JSON: forward the authenticated upstream response unchanged.
  const isMediaRequest = request.method === "GET" && path[0] === "cms" && path[1] === "blogs" && path[2] === "files";
  if (isMediaRequest) {
    try {
      const { response, rotatedRefreshToken, rememberMe } = await requestSuperAdminUpstreamResponse(url.toString());
      const headers = new Headers({ "Cache-Control": "no-store" });
      for (const headerName of ["content-type", "content-length", "content-disposition", "etag"]) {
        const value = response.headers.get(headerName);
        if (value) headers.set(headerName, value);
      }
      const body = response.body ? await response.arrayBuffer() : null;
      return applyRotatedSuperAdminSession(new NextResponse(body, { status: response.status, headers }), rotatedRefreshToken, rememberMe);
    } catch (error) {
      return superAdminErrorResponse(error);
    }
  }

  const contentType = request.headers.get("content-type");
  const isMultipart = Boolean(contentType?.toLowerCase().startsWith("multipart/form-data"));
  const body =
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "DELETE"
      ? undefined
      : isMultipart
        ? await request.arrayBuffer()
        : await request.text();

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

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxy(request, (await context.params).path);
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxy(request, (await context.params).path);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxy(request, (await context.params).path);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxy(request, (await context.params).path);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return proxy(request, (await context.params).path);
}
