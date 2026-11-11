import { resolveSafeProxyPath } from "@ihp/shared/safe-proxy-path";

/** Normalizes only the collection paths whose upstream contracts require a trailing slash. */
export function normalizeEnterpriseChatUpstreamPath(requestPath: string): string {
  const pathWithoutLeadingSlash = requestPath.replace(/^\/+/, "");

  if (pathWithoutLeadingSlash === "messages" || pathWithoutLeadingSlash === "messages/") {
    return "messages/";
  }

  if (pathWithoutLeadingSlash === "uploads" || pathWithoutLeadingSlash === "uploads/") {
    return "uploads/";
  }

  return pathWithoutLeadingSlash;
}

/** Builds the authenticated Chat-token endpoint from an origin-only proxy target. */
export function buildEnterpriseChatTokenUpstreamUrl(proxyTarget: string): string {
  return `${proxyTarget}/api/v1/auth/chat-token`;
}

/** Builds an Enterprise Chat upstream URL without changing unrelated route paths. */
export function buildEnterpriseChatUpstreamUrl(proxyTarget: string, requestPath: string, search = ""): string {
  return `${proxyTarget}/api/v1/${normalizeEnterpriseChatUpstreamPath(requestPath)}${search}`;
}

/**
 * Validates the catch-all chat path and returns the upstream path to append to `/api/v1/`.
 *
 * `segments` are the route parameters (already decoded once by Next.js) and `rawPathname` is the
 * request pathname before decoding. Both are checked, and the result is re-encoded, so a request can
 * never leave the chat API prefix or add a query or fragment.
 *
 * @returns the safe upstream path, or `null` when the request must be answered with 400 and not forwarded
 */
export function resolveEnterpriseChatUpstreamPath(segments: readonly string[], rawPathname: string): string | null {
  const safePath = resolveSafeProxyPath(segments, { rawPathname });
  return safePath === null ? null : normalizeEnterpriseChatUpstreamPath(safePath);
}
