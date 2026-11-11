import { NextResponse, type NextRequest } from "next/server";
import {
  buildProtectedMediaRequestHeaders,
  configuredMediaOrigin,
  copyProtectedMediaResponseHeaders,
  resolveAllowedEventMediaUrl,
} from "@ihp/shared";
import { firstConfiguredUpstream } from "@ihp/shared/upstream-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_COOKIE_NAME = "access_token";
/**
 * Event media URLs stored with the data carry the *public* backend origin, while the server
 * must connect to the *internal* one (for example a private Docker service name). Keeping the
 * two apart means the connection target always comes from configuration, never from the request.
 */
function mediaFetchPolicy() {
  return {
    publicOrigin: configuredMediaOrigin(process.env.NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN),
    internalOrigin: configuredMediaOrigin(firstConfiguredUpstream(process.env, ["EVENTS_API_BASE_URL", "CHAT_PROXY_TARGET", "CHAT_API_BASE_URL"]) ?? undefined),
  };
}

function invalidRequest(detail: string, status = 400): Response {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

async function forward(request: NextRequest): Promise<Response> {
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return invalidRequest("Not authenticated", 401);

  const requestedUrl = request.nextUrl.searchParams.get("url")?.trim();
  const policy = mediaFetchPolicy();
  const upstreamUrl = requestedUrl && policy.internalOrigin
    ? resolveAllowedEventMediaUrl(requestedUrl, policy.internalOrigin, policy.publicOrigin)
    : null;
  if (!upstreamUrl) return invalidRequest("Media URL is not allowed.");

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
