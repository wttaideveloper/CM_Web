import "server-only";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "access_token";
const EXPECTED_AUDIENCE = "invigorate-api";

function getUpstreamBaseUrl() {
  const upstreamBaseUrl = process.env.AUTH_API_BASE_URL;

  if (!upstreamBaseUrl) {
    throw new Error("AUTH_API_BASE_URL is not configured.");
  }

  return upstreamBaseUrl.replace(/\/+$/, "");
}

function buildForwardHeaders(request: NextRequest, accessToken: string) {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");

  if (accept) {
    headers.set("Accept", accept);
  }

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  headers.set("Authorization", `Bearer ${accessToken}`);

  return headers;
}

async function readRequestBody(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const buffer = await request.arrayBuffer();

  return buffer.byteLength > 0 ? buffer : undefined;
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  return Buffer.from(padded, "base64").toString("utf8");
}

function readJwtClaims(token: string) {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readJwtHeader(token: string) {
  const parts = token.split(".");

  if (parts.length < 1) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

function readStringClaim(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readAudienceContainsInvigorateApi(audience: unknown) {
  if (typeof audience === "string") {
    return audience === EXPECTED_AUDIENCE;
  }

  if (Array.isArray(audience)) {
    return audience.some((item) => item === EXPECTED_AUDIENCE);
  }

  return false;
}

function buildResponseHeaders(response: Response) {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const wwwAuthenticate = response.headers.get("www-authenticate");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (wwwAuthenticate) {
    headers.set("WWW-Authenticate", wwwAuthenticate);
  }

  return headers;
}

function addDiagnosticsHeaders(headers: Headers, accessTokenPresent: boolean) {
  headers.set("X-IHP-Profile-Proxy", "reached");
  headers.set("X-IHP-Access-Token-Present", accessTokenPresent ? "true" : "false");
}

function logProfileProxyInvocation(details: {
  accessTokenPresent: boolean;
  upstreamHostname: string;
  upstreamPathname: string;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[profile proxy] profile proxy invoked", {
    access_token_cookie_present: details.accessTokenPresent,
    upstream_hostname: details.upstreamHostname,
    upstream_pathname: details.upstreamPathname,
  });
}

function logProfileProxyUpstreamStatus(status: number) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[profile proxy] upstream response status", {
    upstream_status: status,
  });
}

function logTokenDiagnostics(token: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const claims = readJwtClaims(token);
  const header = readJwtHeader(token);
  const expectedIssuer = process.env.AUTH_EXPECTED_ISSUER ?? process.env.AUTH_API_BASE_URL ?? null;
  const issuer = readStringClaim(claims?.iss);
  const audience = claims?.aud;
  const azp = readStringClaim(claims?.azp);
  const exp = typeof claims?.exp === "number" ? claims.exp : null;
  const nowSeconds = Math.floor(Date.now() / 1000);

  console.log("[profile proxy] token diagnostics", {
    issuer_valid: issuer === expectedIssuer,
    audience_valid: readAudienceContainsInvigorateApi(audience),
    expired: exp !== null && exp <= nowSeconds,
    token_type_bearer: readStringClaim(header?.typ)?.toLowerCase() === "bearer",
    audience_has_invigorate_api: readAudienceContainsInvigorateApi(audience),
    azp_has_invigorate_api: azp === EXPECTED_AUDIENCE,
  });
}

export async function forwardBearerRequest(request: NextRequest, upstreamPath: string) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const accessTokenPresent = Boolean(accessToken);
  const upstreamBaseUrl = getUpstreamBaseUrl();
  const upstreamUrl = new URL(upstreamPath, upstreamBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  logProfileProxyInvocation({
    accessTokenPresent,
    upstreamHostname: upstreamUrl.hostname,
    upstreamPathname: upstreamUrl.pathname,
  });

  if (!accessToken) {
    const response = NextResponse.json(
      { detail: "Not authenticated" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": "Bearer",
        },
      },
    );

    addDiagnosticsHeaders(response.headers, false);
    return response;
  }

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, accessToken),
    body: await readRequestBody(request),
    cache: "no-store",
  });

  const bodyText = await response.text().catch(() => "");
  const responseHeaders = buildResponseHeaders(response);
  addDiagnosticsHeaders(responseHeaders, true);

  logProfileProxyUpstreamStatus(response.status);

  if (response.status === 401) {
    logTokenDiagnostics(accessToken);
  }

  return new NextResponse(bodyText.length > 0 ? bodyText : null, {
    status: response.status,
    headers: responseHeaders,
  });
}
