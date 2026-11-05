import { originOf } from "./upstream-config.ts";

const REQUEST_HEADERS_TO_FORWARD = ["accept", "if-range", "range"] as const;
const RESPONSE_HEADERS_TO_COPY = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

/**
 * Public origin that appears inside backend-issued media URLs. It is a browser-visible
 * value (not a secret) and is distinct from the internal origin a server uses to
 * fetch the bytes. There is deliberately no default: an unconfigured deployment
 * never routes media through the proxy and never talks to a guessed host.
 *
 * Referenced as a literal so Next.js can inline it into the client bundle.
 */
const CONFIGURED_PROTECTED_MEDIA_ORIGIN = originOf(process.env.NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN?.trim());

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Returns true only for the configured protected media service, not pasted external links. */
export function isProtectedMediaUrl(value: string, protectedOrigin: string | null = CONFIGURED_PROTECTED_MEDIA_ORIGIN): boolean {
  const url = parseHttpUrl(value);
  if (!url || !protectedOrigin) return false;
  return url.origin === originOf(protectedOrigin);
}

/** Routes protected media through the app BFF while leaving external links direct. */
export function protectedMediaPreviewUrl(
  value: string,
  proxyPath = "/api/event-media",
  protectedOrigin: string | null = CONFIGURED_PROTECTED_MEDIA_ORIGIN,
): string {
  const url = parseHttpUrl(value);
  if (!url || !isProtectedMediaUrl(value, protectedOrigin)) return value;
  return `${proxyPath}?url=${encodeURIComponent(url.toString())}`;
}

/** Copies browser-safe media request headers and adds the server-only bearer credential. */
export function buildProtectedMediaRequestHeaders(source: Headers, accessToken?: string): Headers {
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  for (const name of REQUEST_HEADERS_TO_FORWARD) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

/** Keeps media metadata needed by images, downloads, and seekable video responses. */
export function copyProtectedMediaResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const name of RESPONSE_HEADERS_TO_COPY) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export function configuredMediaOrigin(value: string | undefined): string | null {
  return originOf(value);
}

export function isAllowedProtectedMediaUrl(value: string, configuredOrigin: string | null): boolean {
  const url = parseHttpUrl(value);
  return Boolean(url && configuredOrigin && url.origin === configuredOrigin);
}

/** Returns true only for Event media paths on the configured protected media service. */
export function isAllowedEventMediaUrl(value: string, configuredOrigin: string | null): boolean {
  const url = parseHttpUrl(value);
  return Boolean(url && configuredOrigin && url.origin === configuredOrigin && /^\/api\/v1\/events\/media(?:\/|$)/.test(url.pathname));
}

/** Where a server may fetch protected media from, and which URLs it accepts as input. */
export interface ProtectedMediaFetchPolicy {
  /** Origin embedded in media URLs stored with the data (what the browser sees). */
  readonly publicOrigin: string | null;
  /** Origin the server actually connects to (for example a private Docker service name). */
  readonly internalOrigin: string | null;
  /** Optional restriction on the URL path, applied to the incoming URL. */
  readonly pathPattern?: RegExp;
}

/**
 * Maps a user-supplied media URL to the URL the server should fetch.
 *
 * The input is accepted only if its origin equals the configured public (or internal)
 * origin and its path matches `pathPattern`; the returned URL always uses the
 * configured internal origin, so the connection target is never attacker-controlled.
 * Credentials and non-HTTP schemes are rejected, and the fragment is dropped.
 *
 * @returns the internal fetch URL, or `null` when the input is not allowed or the internal
 * origin is unconfigured. A missing public origin only narrows what is accepted: URLs that
 * already carry the internal origin still resolve.
 */
export function resolveProtectedMediaFetchUrl(value: string, policy: ProtectedMediaFetchPolicy): string | null {
  const { publicOrigin, internalOrigin, pathPattern } = policy;
  const url = parseHttpUrl(value);
  if (!url || !internalOrigin) return null;
  if (url.username || url.password) return null;
  if (url.origin !== internalOrigin && url.origin !== publicOrigin) return null;
  if (pathPattern && !pathPattern.test(url.pathname)) return null;
  return `${internalOrigin}${url.pathname}${url.search}`;
}

/** Path pattern for Event media assets served by the Marketplace API. */
export const EVENT_MEDIA_PATH_PATTERN = /^\/api\/v1\/events\/media(?:\/|$)/;
