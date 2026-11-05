import { NextResponse, type NextRequest } from "next/server";

import { firstConfiguredUpstream, stripApiV1 } from "@ihp/shared/upstream-config";

import { buildEnterpriseChatUpstreamUrl } from "../proxy-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_COOKIE_NAME = "access_token";
const RESPONSE_HEADERS_TO_COPY = [
  "content-type",
  "content-disposition",
  "content-range",
  "accept-ranges",
] as const;

function getChatProxyTarget(): string | null {
  const configuredTarget = firstConfiguredUpstream(process.env, ["CHAT_PROXY_TARGET"]);
  if (configuredTarget) {
    return stripApiV1(configuredTarget);
  }

  return process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : null;
}

/**
 * Upstream for `POST /auth/chat-token`. It follows the approved chat proxy target unless
 * `CHAT_TOKEN_UPSTREAM_URL` names a separately hosted token service. There is no built-in
 * host, so an unconfigured deployment answers 503 instead of calling an unintended backend.
 */
function getChatTokenUpstream(): string | null {
  const configuredUpstream = firstConfiguredUpstream(process.env, ["CHAT_TOKEN_UPSTREAM_URL"]);
  return configuredUpstream ? stripApiV1(configuredUpstream) : getChatProxyTarget();
}

async function forward(request: NextRequest, path: string[]): Promise<Response> {
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const requestPath = `/${path.join("/")}`;
  const isChatTokenRequest = request.method === "POST" && requestPath === "/auth/chat-token";
  const proxyTarget = isChatTokenRequest ? getChatTokenUpstream() : getChatProxyTarget();
  if (!proxyTarget) {
    return NextResponse.json({ detail: "Chat proxy target is not configured." }, { status: 503 });
  }

  const upstreamUrl = isChatTokenRequest
    ? `${proxyTarget}/api/v1/auth/chat-token`
    : buildEnterpriseChatUpstreamUrl(proxyTarget, requestPath, request.nextUrl.search);
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (accept) {
    headers.set("Accept", accept);
  }

  headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let upstream: Response;
  const fetchStartedAt = Date.now();
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error: unknown) {
    const errorRecord = error instanceof Error ? error as Error & { code?: unknown; cause?: unknown } : null;
    const causeRecord = errorRecord?.cause && typeof errorRecord.cause === "object"
      ? errorRecord.cause as { code?: unknown }
      : null;
    const errorCode = typeof errorRecord?.code === "string" ? errorRecord.code : undefined;
    const causeCode = typeof causeRecord?.code === "string" ? causeRecord.code : undefined;
    const code = errorCode ?? causeCode;
    const errorName = errorRecord?.name ?? "UnknownError";
    const timedOut = errorName === "AbortError" || errorName === "TimeoutError" || code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT";
    const failureType = timedOut
      ? "timeout"
      : code === "ENOTFOUND" || code === "EAI_AGAIN"
        ? "dns"
        : code === "ECONNRESET"
          ? "connection_reset"
          : code === "ECONNREFUSED"
            ? "connection_refused"
            : code === "CERT_HAS_EXPIRED" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "ERR_TLS_CERT_ALTNAME_INVALID"
              ? "tls"
              : "other";

    let hostname = "unknown";
    try {
      hostname = new URL(upstreamUrl).hostname;
    } catch {
      // Keep diagnostics safe even if configuration contains an invalid URL.
    }

    console.error("[chat-proxy] upstream fetch failed", {
      method: request.method,
      path: `/${path.join("/")}`,
      hostname,
      elapsedMs: Date.now() - fetchStartedAt,
      errorName,
      errorCode,
      causeCode,
      timedOut,
      failureType,
    });

    return NextResponse.json({ detail: "Chat proxy request failed." }, { status: 502 });
  }

  if (upstream.status >= 500) {
    // Route and status only: the upstream URL carries query parameters that must not be logged.
    console.error("[chat-proxy] upstream server error", { method: request.method, path: requestPath, status: upstream.status });
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS_TO_COPY) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }
  responseHeaders.set("Cache-Control", "no-store");

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path);
}
