const PROTECTED_MEDIA_ORIGIN = "https://chat.wisdomtooth.tech";

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
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Returns true only for the configured protected media service, not pasted external links. */
export function isProtectedMediaUrl(value: string, protectedOrigin = PROTECTED_MEDIA_ORIGIN): boolean {
  const url = parseHttpUrl(value);
  if (!url) return false;
  try {
    return url.origin === new URL(protectedOrigin).origin;
  } catch {
    return false;
  }
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

export function configuredMediaOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
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
