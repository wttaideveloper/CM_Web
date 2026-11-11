const PROTECTED_MEDIA_ORIGIN = "https://chat.wisdomtooth.tech";
const STAGING_PROTECTED_MEDIA_ORIGIN = "https://marketplace-api.wisdomtoothstage.tech";
const APPROVED_PROTECTED_MEDIA_ORIGINS = new Set([PROTECTED_MEDIA_ORIGIN, STAGING_PROTECTED_MEDIA_ORIGIN]);

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

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password && !url.hash ? url : null;
  } catch {
    return null;
  }
}

/** Returns true only for the configured protected media service, not pasted external links. */
export function isProtectedMediaUrl(value: string, protectedOrigin?: string): boolean {
  const url = parseHttpUrl(value);
  if (!url) return false;
  if (protectedOrigin) return url.origin === configuredMediaOrigin(protectedOrigin, { allowLocalhost: true });
  return APPROVED_PROTECTED_MEDIA_ORIGINS.has(url.origin);
}

/** Routes protected media through the app BFF while leaving external links direct. */
export function protectedMediaPreviewUrl(value: string, proxyPath = "/api/event-media"): string {
  const url = parseHttpUrl(value);
  if (!url || !isProtectedMediaUrl(value)) return value;
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

/** Resolves only an approved protected-media origin, with an explicit localhost development escape hatch. */
export function configuredMediaOrigin(value: string | undefined, options: { allowLocalhost?: boolean } = {}): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (options.allowLocalhost && isLocalhost) {
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.hash) return null;
      return url.origin;
    }
    if (url.protocol !== "https:" || url.username || url.password || url.hash || url.port || !APPROVED_PROTECTED_MEDIA_ORIGINS.has(url.origin)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isAllowedProtectedMediaUrl(value: string, configuredOrigin: string | null): boolean {
  const url = parseHttpUrl(value);
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined, { allowLocalhost: true });
  return Boolean(url && safeOrigin && url.origin === safeOrigin);
}

/** Returns true only for Event media paths on the configured protected media service. */
export function isAllowedEventMediaUrl(value: string, configuredOrigin: string | null): boolean {
  const url = parseHttpUrl(value);
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined, { allowLocalhost: true });
  return Boolean(url && safeOrigin && url.origin === safeOrigin && isEventMediaPath(url.pathname));
}

function isEventMediaPath(pathname: string): boolean {
  return /^\/api\/v1\/events\/media(?:\/|$)/.test(pathname);
}

function isBlogMediaPath(pathname: string): boolean {
  return /^\/api\/v1\/cms\/blogs\/files(?:\/|$)/.test(pathname);
}

/**
 * Resolves a stored Event media URL to the configured protected media origin.
 *
 * The staging backend serves the legacy Event media paths, so only the exact
 * approved legacy origin may be translated to the approved Hostinger origin.
 * Other hosts, protocols, ports, and paths remain rejected.
 */
export function resolveAllowedEventMediaUrl(value: string, configuredOrigin: string | null): string | null {
  const url = parseHttpUrl(value);
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined, { allowLocalhost: true });
  if (!url || !safeOrigin || !isEventMediaPath(url.pathname)) return null;
  if (url.origin === safeOrigin) return url.toString();
  if (url.origin !== PROTECTED_MEDIA_ORIGIN || safeOrigin !== STAGING_PROTECTED_MEDIA_ORIGIN) return null;

  const resolved = new URL(safeOrigin);
  resolved.pathname = url.pathname;
  resolved.search = url.search;
  return resolved.toString();
}


/** Resolves only approved legacy Blog media paths to the configured Hostinger origin. */
export function resolveAllowedBlogMediaUrl(value: string, configuredOrigin: string | null): string | null {
  const url = parseHttpUrl(value);
  const safeOrigin = configuredMediaOrigin(configuredOrigin ?? undefined, { allowLocalhost: true });
  if (!url || !safeOrigin || !isBlogMediaPath(url.pathname)) return null;
  if (url.origin === safeOrigin) return url.toString();
  if (url.origin !== PROTECTED_MEDIA_ORIGIN || safeOrigin !== STAGING_PROTECTED_MEDIA_ORIGIN) return null;

  const resolved = new URL(safeOrigin);
  resolved.pathname = url.pathname;
  resolved.search = url.search;
  return resolved.toString();
}
