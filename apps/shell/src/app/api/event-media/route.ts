import { NextResponse, type NextRequest } from "next/server";
import {
  buildProtectedMediaRequestHeaders,
  configuredMediaOrigin,
  copyProtectedMediaResponseHeaders,
  isAllowedEventMediaUrl,
} from "@ihp/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_COOKIE_NAME = "access_token";
const MEDIA_PROXY_ORIGIN = configuredMediaOrigin(process.env.CHAT_PROXY_TARGET ?? process.env.CHAT_API_BASE_URL) ?? "https://chat.wisdomtooth.tech";

function invalidRequest(detail: string, status = 400): Response {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

async function forward(request: NextRequest): Promise<Response> {
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return invalidRequest("Not authenticated", 401);

  const upstreamUrl = request.nextUrl.searchParams.get("url")?.trim();
  if (!upstreamUrl || !isAllowedEventMediaUrl(upstreamUrl, MEDIA_PROXY_ORIGIN)) return invalidRequest("Media URL is not allowed.");

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildProtectedMediaRequestHeaders(request.headers, token),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return invalidRequest("Media proxy request failed.", 502);
  }

  const headers = copyProtectedMediaResponseHeaders(upstream.headers);
  headers.set("Cache-Control", "no-store");
  return new NextResponse(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

export function GET(request: NextRequest): Promise<Response> {
  return forward(request);
}

export function HEAD(request: NextRequest): Promise<Response> {
  return forward(request);
}
