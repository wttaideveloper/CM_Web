import { resolveSafeProxyPath } from "@ihp/shared/safe-proxy-path";

/** Keeps only the chat message collection aligned with its trailing-slash API contract. */
export function normalizeChatUpstreamPath(requestPath: string): string {
  const pathWithoutLeadingSlash = requestPath.replace(/^\/+/, "");

  return pathWithoutLeadingSlash === "messages" || pathWithoutLeadingSlash === "messages/"
    ? "messages/"
    : pathWithoutLeadingSlash;
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
export function resolveChatUpstreamPath(segments: readonly string[], rawPathname: string): string | null {
  const safePath = resolveSafeProxyPath(segments, { rawPathname });
  return safePath === null ? null : normalizeChatUpstreamPath(safePath);
}
