import { NextResponse, type NextRequest } from "next/server";

import { firstConfiguredUpstream, stripApiV1 } from "@ihp/shared/upstream-config";

import { normalizeChatUpstreamPath } from "./proxy-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chat REST upstream. Loopback is a development convenience only; an unconfigured
 * production deployment answers 503 instead of dialing the container's own localhost.
 */
function getChatProxyTarget(): string | null {
  const configuredTarget = firstConfiguredUpstream(process.env, ["CHAT_PROXY_TARGET"]);
  if (configuredTarget) return stripApiV1(configuredTarget);
  return process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : null;
}

const TOKEN_COOKIE_NAME = "access_token";

const RESPONSE_HEADERS_TO_COPY = [
  "content-type",
  "content-disposition",
  "content-range",
  "accept-ranges",
];

async function forward(request: NextRequest, path: string[]): Promise<Response> {
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const chatProxyTarget = getChatProxyTarget();
  if (!chatProxyTarget) {
    return NextResponse.json({ detail: "Chat proxy target is not configured." }, { status: 503 });
  }

  const search = request.nextUrl.search;
  const requestPath = `/${path.join("/")}`;
  const upstreamPath = normalizeChatUpstreamPath(requestPath);
  const targetUrl = `${chatProxyTarget}/api/v1/${upstreamPath}${search}`;

  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("Accept", accept);
  }

  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Cookie", `${TOKEN_COOKIE_NAME}=${token}`);

  let body: BodyInit | undefined;

  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let upstream: Response;

  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  const responseHeaders = new Headers();

  for (const name of RESPONSE_HEADERS_TO_COPY) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  responseHeaders.set("Cache-Control", "no-store");

  const upstreamBody = await upstream.arrayBuffer();

  return new NextResponse(upstreamBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}
