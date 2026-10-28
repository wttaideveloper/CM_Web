import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_COOKIE_NAME = "access_token";
const MEDIA_ORIGIN = (process.env.CHAT_PROXY_TARGET ?? process.env.CHAT_API_BASE_URL ?? "https://chat.wisdomtooth.tech")
  .replace(/\/$/, "")
  .replace(/\/api\/v1$/, "");
const WORKFLOW_ORIGIN = (process.env.WORKFLOW_API_BASE_URL ?? "")
  .replace(/\/$/, "")
  .replace(/\/api\/v1$/, "");

async function forward(request: NextRequest, assetId: string): Promise<Response> {
  let token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const requestCookie = request.headers.get("cookie");
  if (!token && !requestCookie) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  // Some web-auth sessions expose only the HttpOnly session cookie. Exchange
  // that session for the short-lived chat bearer token required by media.
  if (!token && requestCookie) {
    try {
      const tokenResponse = await fetch(`${MEDIA_ORIGIN}/api/v1/auth/chat-token`, {
        method: "POST",
        headers: { Cookie: requestCookie, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (tokenResponse.ok) {
        const tokenBody = await tokenResponse.json() as { access_token?: unknown };
        token = typeof tokenBody.access_token === "string" && tokenBody.access_token.trim() ? tokenBody.access_token : undefined;
      }
    } catch {
      // Continue with the original session cookie; the upstream response will
      // provide the authoritative authorization result.
    }
  }

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(assetId)) {
    return NextResponse.json({ detail: "Invalid media asset ID" }, { status: 400 });
  }

  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // The media service can authorize the same request through the session
  // cookie used by the app's normal API rewrites. Preserve that cookie jar
  // instead of forwarding only a reconstructed access-token cookie.
  if (requestCookie) headers.set("Cookie", requestCookie);
  for (const name of ["accept", "range", "if-range"] as const) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstreamUrl = `${MEDIA_ORIGIN}/api/v1/media/${encodeURIComponent(assetId)}/file`;
  const sourceUrl = request.nextUrl.searchParams.get("source")?.trim();
  if (sourceUrl) {
    try {
      const parsedSource = new URL(sourceUrl);
      const expectedPath = `/api/v1/media/${encodeURIComponent(assetId)}/file`;
      if (parsedSource.origin !== MEDIA_ORIGIN || parsedSource.pathname !== expectedPath) {
        return NextResponse.json({ detail: "Invalid media source URL" }, { status: 400 });
      }
      upstreamUrl = parsedSource.toString();
    } catch {
      return NextResponse.json({ detail: "Invalid media source URL" }, { status: 400 });
    }
  }

  const upstreamUrls = [
    upstreamUrl,
    ...(WORKFLOW_ORIGIN ? [
      `${WORKFLOW_ORIGIN}/api/v1/media/${encodeURIComponent(assetId)}/file`,
      `${WORKFLOW_ORIGIN}/api/platform-super-admin/media/${encodeURIComponent(assetId)}/file`,
    ] : []),
  ].filter((url, index, urls) => urls.indexOf(url) === index);

  let upstream: Response | null = null;
  for (const candidateUrl of upstreamUrls) {
    try {
      const candidate = await fetch(candidateUrl, {
        method: request.method,
        headers,
        cache: "no-store",
        // Follow storage/CDN redirects so the browser receives the actual
        // image bytes instead of an unhandled redirect response.
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      upstream = candidate;
      if (candidate.status !== 404) break;
    } catch {
      // Try the next configured media service before returning a proxy error.
    }
  }
  if (!upstream) {
    return NextResponse.json({ detail: "Media proxy request failed" }, { status: 502 });
  }

  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["accept-ranges", "cache-control", "content-disposition", "content-length", "content-range", "content-type", "etag", "last-modified"] as const) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new NextResponse(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: NextRequest, context: { params: Promise<{ assetId: string }> }): Promise<Response> {
  const { assetId } = await context.params;
  return forward(request, assetId);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ assetId: string }> }): Promise<Response> {
  const { assetId } = await context.params;
  return forward(request, assetId);
}
