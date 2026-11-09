import {
  isTrustedUpstreamUrl,
  normalizeUpstreamBaseUrl,
  parseOriginAllowlist,
  type EnvSource,
} from "@ihp/shared/upstream-config";

/**
 * Environment variable holding the comma-separated origins to which the server-held
 * Super Admin bearer token may be sent (for example the Marketplace API).
 *
 * This replaces the previous hard-coded `chat.wisdomtooth.tech` checks. The list is
 * empty by default, so an unconfigured deployment refuses to forward credentials
 * anywhere instead of trusting a built-in host.
 */
export const TRUSTED_UPSTREAM_ORIGINS_ENV = "PLATFORM_TRUSTED_UPSTREAM_ORIGINS";

/**
 * Builds a Marketplace API URL for a server-side request that carries the Super Admin
 * bearer token.
 *
 * The target is derived only from deployment configuration (`CHAT_API_BASE_URL`), never
 * from request input, and is returned only when its exact origin is allowlisted in
 * {@link TRUSTED_UPSTREAM_ORIGINS_ENV}. Cleartext `http:` additionally requires an
 * internal host (see `isInternalHostname`), so a bearer token cannot cross a public
 * network unencrypted.
 *
 * @param pathname absolute API path such as `/api/v1/events/`; replaces any base path
 * @param search query string (with or without leading `?`), empty by default
 * @returns the URL, or `null` when the API is unconfigured or its origin is not trusted
 */
export function resolveMarketplaceUrl(pathname: string, search = "", env: EnvSource = process.env): URL | null {
  const base = normalizeUpstreamBaseUrl(env.CHAT_API_BASE_URL);
  if (!base) return null;

  const url = new URL(base);
  if (!isTrustedUpstreamUrl(url, parseOriginAllowlist(env[TRUSTED_UPSTREAM_ORIGINS_ENV]))) return null;

  url.pathname = pathname;
  url.search = search;
  return url;
}

/**
 * Returns the trusted Marketplace API origin (no path), or `null` when unconfigured or untrusted.
 * Used where the server builds media URLs against the same backend.
 */
export function resolveMarketplaceOrigin(env: EnvSource = process.env): string | null {
  return resolveMarketplaceUrl("/", "", env)?.origin ?? null;
}
