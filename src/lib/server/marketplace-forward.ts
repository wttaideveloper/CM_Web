import "server-only";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "access_token";
const MARKETPLACE_API_BASE_URL = process.env.MARKETPLACE_API_BASE_URL;

type JwtClaims = Record<string, unknown>;

function getMarketplaceBaseUrl() {
  if (!MARKETPLACE_API_BASE_URL) {
    throw new Error("MARKETPLACE_API_BASE_URL is not configured.");
  }

  return MARKETPLACE_API_BASE_URL.replace(/\/+$/, "");
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  return Buffer.from(padded, "base64").toString("utf8");
}

function readJwtClaims(token: string): JwtClaims | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as JwtClaims;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readBooleanFromNumber(value: unknown) {
  return typeof value === "number" ? value > 0 : Boolean(value);
}

function readAudClaim(aud: unknown) {
  if (typeof aud === "string") {
    return aud;
  }

  if (Array.isArray(aud)) {
    return aud.filter((item): item is string => typeof item === "string");
  }

  return null;
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

function logMarketplaceDiagnostics(details: {
  tokenSource: "access_token_cookie" | "missing";
  tokenExpiredAccordingToExp: boolean;
  tokenAudience: string | string[] | null;
  authorizedParty: string | null;
  tenantRole: string | null;
  upstreamPathname: string;
  upstreamStatus: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[marketplace proxy] diagnostics", details);
}

async function buildProxyResponse(response: Response) {
  const contentType = response.headers.get("content-type");
  const bodyText = await response.text().catch(() => "");
  const isJson =
    contentType !== null &&
    (contentType.toLowerCase().includes("application/json") || contentType.toLowerCase().includes("+json"));

  if (isJson) {
    const headers = new Headers();

    headers.set("Content-Type", contentType);

    return new NextResponse(bodyText.length > 0 ? bodyText : null, {
      status: response.status,
      headers,
    });
  }

  return NextResponse.json(
    {
      detail: bodyText || response.statusText || "Marketplace request failed.",
    },
    {
      status: response.status,
    },
  );
}

export async function forwardMarketplaceRequest(request: NextRequest, upstreamPath: string) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const marketplaceBaseUrl = getMarketplaceBaseUrl();
  const normalizedBase = `${marketplaceBaseUrl}/`;
  const normalizedPath = upstreamPath.replace(/^\/+/, "");
  const upstreamUrl = new URL(normalizedPath, normalizedBase);
  upstreamUrl.search = request.nextUrl.search;

  const claims = accessToken ? readJwtClaims(accessToken) : null;
  const exp = typeof claims?.exp === "number" ? claims.exp : null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tenantRole = readString(claims?.tenant_role) ?? readString(claims?.tenantRole) ?? null;

  if (!accessToken) {
    logMarketplaceDiagnostics({
      tokenSource: "missing",
      tokenExpiredAccordingToExp: false,
      tokenAudience: null,
      authorizedParty: null,
      tenantRole,
      upstreamPathname: upstreamUrl.pathname,
      upstreamStatus: 401,
    });

    return NextResponse.json(
      {
        detail: "Missing authenticated web access token",
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, accessToken),
    body: await readRequestBody(request),
    cache: "no-store",
  });

  logMarketplaceDiagnostics({
    tokenSource: "access_token_cookie",
    tokenExpiredAccordingToExp: exp !== null ? exp <= nowSeconds : false,
    tokenAudience: readAudClaim(claims?.aud),
    authorizedParty: readString(claims?.azp),
    tenantRole,
    upstreamPathname: upstreamUrl.pathname,
    upstreamStatus: response.status,
  });

  return buildProxyResponse(response);
}
