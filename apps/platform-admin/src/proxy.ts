import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy, createCspNonce, cspHeaderName } from "@ihp/shared";
import { isSafeRawPathname } from "@ihp/shared/safe-proxy-path";

/**
 * Path prefixes of the server-side proxies that forward a catch-all path to an upstream. A request whose raw
 * path carries malformed percent-encoding, encoded separators or dots, or double encoding is answered with 400
 * here, before Next.js decodes it (it would otherwise answer a bare 500) and before any handler or backend runs.
 */
const GUARDED_PROXY_PREFIXES = [
  "/api/platform-super-admin/forms/",
  "/api/platform-super-admin/workflows/",
  "/api/platform-super-admin/media/",
] as const;

/**
 * Applies a per-request, nonce-based Content-Security-Policy (handbook §7) and refuses unsafe proxy paths.
 *
 * Next.js reads the nonce from the *request* CSP header while rendering, so the
 * policy is set on both the forwarded request and the response. `CSP_REPORT_ONLY=true`
 * downgrades the policy to report-only as a rollout kill-switch; it is not a default.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (GUARDED_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return isSafeRawPathname(pathname)
      ? NextResponse.next()
      : NextResponse.json({ detail: "Invalid Workflow path." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const nonce = createCspNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV === "development",
    // Platform Admin never opens the chat socket, so no extra connect origins are needed.
    connectOrigins: [],
  });
  const headerName = cspHeaderName(process.env.CSP_REPORT_ONLY === "true");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(headerName, policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, policy);
  return response;
}

export const config = {
  matcher: [
    "/api/platform-super-admin/forms/:path*",
    "/api/platform-super-admin/workflows/:path*",
    "/api/platform-super-admin/media/:path*",
    {
      // API routes, static assets and the health probe do not render HTML documents.
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
