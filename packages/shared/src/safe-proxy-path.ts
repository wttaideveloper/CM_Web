/**
 * Validation of the request path that a server-side proxy (BFF) appends to a fixed upstream.
 *
 * The proxies receive a catch-all path from Next.js whose segments are already percent-decoded once,
 * so `..%2f..%2fadmin` arrives as the single segment `../../admin`. Joining such segments into the
 * upstream URL lets a caller leave the intended API prefix and reach any other path on the upstream
 * with their own credentials. This module accepts only plain path segments and re-encodes them, so
 * what is forwarded can never contain a separator, a dot segment, a query or a fragment.
 *
 * Handbook §7/§10 (OWASP API Top 10): the client is never a trust boundary.
 */

/** Longest accepted path, in characters, before and after encoding. */
const MAX_PATH_LENGTH = 2048;
const MAX_SEGMENTS = 16;
const MAX_SEGMENT_LENGTH = 255;

/** A `%` that is not followed by two hexadecimal digits is malformed percent-encoding. */
const MALFORMED_PERCENT_ESCAPE = /%(?![0-9a-f]{2})/i;

/**
 * Percent-escapes that must never appear in the raw request path, in any letter case:
 * slash (`%2f`), backslash (`%5c`), dot (`%2e`), percent (`%25`, i.e. double encoding) and NUL (`%00`).
 */
const FORBIDDEN_RAW_ESCAPE = /%(?:2f|5c|2e|25|00)/i;

/** Characters a decoded segment may not contain: controls, path separators, `%`, and URL delimiters. */
const FORBIDDEN_SEGMENT_CHARACTER = /[\u0000-\u001f\u007f/\\%?#]/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

/** `.` and `..` (also with surrounding whitespace, which some servers trim) are dot segments. */
function isDotSegment(segment: string): boolean {
  const trimmed = segment.trim();
  return trimmed === "." || trimmed === "..";
}

/**
 * Checks the raw, still percent-encoded pathname of the incoming request.
 *
 * Rejecting encoded separators, encoded dots, double encoding and malformed escapes here means the
 * decoded form is never relied on alone, whatever the framework did before the handler ran.
 */
export function isSafeRawPathname(rawPathname: string): boolean {
  if (rawPathname.length > MAX_PATH_LENGTH * 3) return false;
  if (MALFORMED_PERCENT_ESCAPE.test(rawPathname)) return false;
  if (FORBIDDEN_RAW_ESCAPE.test(rawPathname)) return false;
  if (rawPathname.includes("\\")) return false;

  let decoded: string;
  try {
    // Throws on invalid UTF-8 such as the overlong slash `%c0%af`.
    decoded = decodeURIComponent(rawPathname);
  } catch {
    return false;
  }
  if (CONTROL_CHARACTER.test(decoded)) return false;
  return !decoded.split("/").some(isDotSegment);
}

/** Checks one already-decoded path segment, including its Unicode-compatibility (NFKC) form. */
function isSafeDecodedSegment(segment: string): boolean {
  if (segment.length === 0 || segment.length > MAX_SEGMENT_LENGTH) return false;
  // Fullwidth look-alikes (for example U+FF0E, U+FF0F) normalize to `.` and `/`.
  for (const candidate of new Set([segment, segment.normalize("NFKC")])) {
    if (candidate.trim() === "" || isDotSegment(candidate) || FORBIDDEN_SEGMENT_CHARACTER.test(candidate)) return false;
  }
  return true;
}

/** Options for {@link resolveSafeProxyPath}. */
export interface SafeProxyPathOptions {
  /** The raw (still percent-encoded) pathname of the request; validated before the decoded segments. */
  readonly rawPathname?: string;
  /** Accept an empty segment list (a collection route with no sub-path). Defaults to false. */
  readonly allowEmpty?: boolean;
  /** Prefix the result must stay under once joined to the upstream origin. Defaults to `/api/v1/`. */
  readonly upstreamPrefix?: string;
}

/**
 * Turns catch-all segments into a safe, percent-encoded upstream path (no leading slash).
 *
 * Validates the raw pathname first (when supplied), then every decoded segment, then re-encodes each
 * segment with `encodeURIComponent` so decoded `?`, `#` or spaces cannot change the forwarded URL.
 * One trailing empty segment is accepted and kept as a trailing slash, because some upstream
 * collection routes require it.
 *
 * @returns the path to append to the upstream prefix, or `null` when the request must be refused
 * with HTTP 400 and never forwarded.
 */
export function resolveSafeProxyPath(segments: readonly string[], options: SafeProxyPathOptions = {}): string | null {
  const { rawPathname, allowEmpty = false, upstreamPrefix = "/api/v1/" } = options;
  if (rawPathname !== undefined && !isSafeRawPathname(rawPathname)) return null;

  const hasTrailingSlash = segments.length > 1 && segments[segments.length - 1] === "";
  const parts = hasTrailingSlash ? segments.slice(0, -1) : segments;
  if (parts.length === 0) return allowEmpty ? "" : null;
  if (parts.length > MAX_SEGMENTS) return null;

  let path: string;
  try {
    const encoded: string[] = [];
    for (const segment of parts) {
      if (!isSafeDecodedSegment(segment)) return null;
      encoded.push(encodeURIComponent(segment));
    }
    path = encoded.join("/") + (hasTrailingSlash ? "/" : "");
  } catch {
    // `encodeURIComponent` throws on a lone surrogate, which is not a valid path in any case.
    return null;
  }
  if (path.length > MAX_PATH_LENGTH) return null;

  // Final guard: URL normalization must not carry the result out of the prefix or add a query/fragment.
  const probe = new URL(`${upstreamPrefix}${path}`, "http://upstream.invalid");
  if (!probe.pathname.startsWith(upstreamPrefix) || probe.search !== "" || probe.hash !== "") return null;

  return path;
}
