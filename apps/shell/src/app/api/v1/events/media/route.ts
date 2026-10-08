import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_COOKIE_NAME = "access_token";
const RESPONSE_HEADERS_TO_COPY = ["content-type", "content-disposition", "content-length"] as const;

function eventMediaTarget(): string {
  const configured = process.env.EVENTS_API_BASE_URL ?? process.env.CHAT_PROXY_TARGET ?? process.env.CHAT_API_BASE_URL ?? "https://chat.wisdomtooth.tech";
  const base = configured.replace(/\/$/, "");
  return /\/api\/v1$/.test(base) ? `${base}/events/media/` : `${base}/api/v1/events/media/`;
}

async function forward(request: NextRequest): Promise<Response> {
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  let upstream: Response;
  try {
    upstream = await fetch(eventMediaTarget(), {
      method: "POST",
      headers,
      body: await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ detail: "Event media proxy request failed." }, { status: 502 });
  }

  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const name of RESPONSE_HEADERS_TO_COPY) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
}

export function POST(request: NextRequest): Promise<Response> {
  return forward(request);
}
