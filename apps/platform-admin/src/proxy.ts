import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy, createCspNonce, cspHeaderName } from "@ihp/shared";

/**
 * Applies a per-request, nonce-based Content-Security-Policy (handbook §7).
 *
 * Next.js reads the nonce from the *request* CSP header while rendering, so the
 * policy is set on both the forwarded request and the response. `CSP_REPORT_ONLY=true`
 * downgrades the policy to report-only as a rollout kill-switch; it is not a default.
 */
export function proxy(request: NextRequest): NextResponse {
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
