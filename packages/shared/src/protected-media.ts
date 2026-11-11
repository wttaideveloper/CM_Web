import { isSafeRawPathname } from "./safe-proxy-path.ts";
import { originOf } from "./upstream-config.ts";

/** Exact legacy public origin whose approved Event/Blog paths may be migrated to staging. */
export const LEGACY_PROTECTED_MEDIA_ORIGIN = "https://chat.wisdomtooth.tech";
/** Exact Hostinger staging API origin used by the approved legacy-media resolver. */
export const STAGING_PROTECTED_MEDIA_ORIGIN = "https://marketplace-api.wisdomtoothstage.tech";

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
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password && !url.hash ? url : null;
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
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined);
  return Boolean(url && safeOrigin && url.origin === safeOrigin);
}

/** Returns true only for Event media paths on the configured protected media service. */
export function isAllowedEventMediaUrl(value: string, configuredOrigin: string | null): boolean {
  const url = parseHttpUrl(value);
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined);
  return Boolean(url && safeOrigin && url.origin === safeOrigin && EVENT_MEDIA_PATH_PATTERN.test(url.pathname));
}

export const BLOG_MEDIA_PATH_PATTERN = /^\/api\/v1\/cms\/blogs\/files\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/**
 * Resolves a stored Event media URL to the configured protected media origin.
 *
 * The staging backend serves the legacy Event media paths, so only the exact
 * approved legacy origin may be translated to the approved Hostinger origin.
 * Other hosts, protocols, ports, and paths remain rejected.
 */
export function resolveAllowedEventMediaUrl(value: string, configuredOrigin: string | null, publicOrigin?: string | null): string | null {
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined);
  if (!safeOrigin) return null;
  return resolveProtectedMediaFetchUrl(value, {
    publicOrigin: configuredMediaOrigin(publicOrigin ?? undefined) ?? (safeOrigin === STAGING_PROTECTED_MEDIA_ORIGIN ? LEGACY_PROTECTED_MEDIA_ORIGIN : null),
    internalOrigin: safeOrigin,
    legacyPublicOrigins: safeOrigin === STAGING_PROTECTED_MEDIA_ORIGIN ? [LEGACY_PROTECTED_MEDIA_ORIGIN] : [],
    pathPattern: EVENT_MEDIA_PATH_PATTERN,
  });
}


/** Resolves only approved legacy Blog media paths to the configured Hostinger origin. */
export function resolveAllowedBlogMediaUrl(value: string, configuredOrigin: string | null, publicOrigin?: string | null): string | null {
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined);
  if (!safeOrigin) return null;
  return resolveProtectedMediaFetchUrl(value, {
    publicOrigin: configuredMediaOrigin(publicOrigin ?? undefined) ?? (safeOrigin === STAGING_PROTECTED_MEDIA_ORIGIN ? LEGACY_PROTECTED_MEDIA_ORIGIN : null),
    internalOrigin: safeOrigin,
    legacyPublicOrigins: safeOrigin === STAGING_PROTECTED_MEDIA_ORIGIN ? [LEGACY_PROTECTED_MEDIA_ORIGIN] : [],
    pathPattern: BLOG_MEDIA_PATH_PATTERN,
  });
}

/** Where a server may fetch protected media from, and which URLs it accepts as input. */
export interface ProtectedMediaFetchPolicy {
  /** Origin embedded in media URLs stored with the data (what the browser sees). */
  readonly publicOrigin: string | null;
  /** Origin the server actually connects to (for example a private Docker service name). */
  readonly internalOrigin: string | null;
  /** Optional restriction on the URL path, applied to the incoming URL. */
  readonly pathPattern?: RegExp;
  /** Additional exact public origins allowed only for an explicitly approved compatibility path. */
  readonly legacyPublicOrigins?: readonly string[];
}

/**
 * Maps a user-supplied media URL to the URL the server should fetch.
 *
 * The input is accepted only if its origin equals the configured public (or internal)
 * origin and its path matches `pathPattern`; the returned URL always uses the
 * configured internal origin, so the connection target is never attacker-controlled.
 * Credentials and non-HTTP schemes are rejected, and the fragment is dropped.
 * A path carrying encoded separators, encoded dots, double encoding or malformed escapes is
 * rejected as well, so the pattern cannot be satisfied by something the upstream decodes differently.
 *
 * @returns the internal fetch URL, or `null` when the input is not allowed or the internal
 * origin is unconfigured. A missing public origin only narrows what is accepted: URLs that
 * already carry the internal origin still resolve.
 */
export function resolveProtectedMediaFetchUrl(value: string, policy: ProtectedMediaFetchPolicy): string | null {
  const { publicOrigin, internalOrigin, legacyPublicOrigins = [], pathPattern } = policy;
  const url = parseHttpUrl(value);
  if (!url || !internalOrigin) return null;
  if (url.username || url.password) return null;
  const allowedOrigins = new Set([internalOrigin, publicOrigin, ...legacyPublicOrigins].filter((origin): origin is string => Boolean(origin)));
  if (!allowedOrigins.has(url.origin)) return null;
  if (!isSafeRawPathname(url.pathname)) return null;
  if (pathPattern && !pathPattern.test(url.pathname)) return null;
  return `${internalOrigin}${url.pathname}${url.search}`;
}

/**
 * Path pattern for ONE Event media asset served by the Marketplace API: exactly one `<asset id>.<ext>`
 * segment under `/api/v1/events/media/` (the backend route is `/{asset_file}`). Sub-paths, empty names
 * and the bare collection are not media files and are refused.
 */
export const EVENT_MEDIA_PATH_PATTERN = /^\/api\/v1\/events\/media\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
