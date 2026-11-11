import { BLOG_MEDIA_PATH_PATTERN, configuredMediaOrigin, EVENT_MEDIA_PATH_PATTERN, LEGACY_PROTECTED_MEDIA_ORIGIN, STAGING_PROTECTED_MEDIA_ORIGIN, resolveProtectedMediaFetchUrl } from "@ihp/shared/protected-media";
import type { EnvSource } from "@ihp/shared/upstream-config";

import { resolveMarketplaceOrigin } from "./marketplace-url.ts";

/**
 * Maps an Event media URL held by the browser to the URL the server may fetch with the Super Admin token.
 *
 * Accepted only when the URL is on the public media origin (or already on the trusted internal Marketplace
 * origin) AND its path is exactly one Event media asset under `/api/v1/events/media/`. The returned URL
 * always uses the trusted internal origin from `CHAT_API_BASE_URL` / `PLATFORM_TRUSTED_UPSTREAM_ORIGINS`,
 * so neither the host nor the path can be chosen by the caller. Encoded separators, encoded dots, double
 * encoding and malformed escapes are refused.
 *
 * @param requestedUrl the `url` query parameter supplied by the browser
 * @param publicMediaOrigin the public origin inside backend media URLs. Pass `process.env.NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN`
 * from the route so Next.js can inline the build-time value; an environment object cannot be inlined.
 * @returns the internal fetch URL, or `null` when the request must be refused with 400
 */
export function resolvePlatformEventMediaFetchUrl(
  requestedUrl: string | null | undefined,
  publicMediaOrigin: string | undefined,
  env: EnvSource = process.env,
): string | null {
  const value = requestedUrl?.trim();
  if (!value) return null;
  return resolveProtectedMediaFetchUrl(value, {
    publicOrigin: configuredMediaOrigin(publicMediaOrigin),
    internalOrigin: resolveMarketplaceOrigin(env),
    legacyPublicOrigins: resolveMarketplaceOrigin(env) === STAGING_PROTECTED_MEDIA_ORIGIN ? [LEGACY_PROTECTED_MEDIA_ORIGIN] : [],
    pathPattern: EVENT_MEDIA_PATH_PATTERN,
  });
}

/** Resolves approved legacy or native Blog media through the trusted Marketplace origin. */
export function resolvePlatformBlogMediaFetchUrl(
  requestedUrl: string | null | undefined,
  publicMediaOrigin: string | undefined,
  env: EnvSource = process.env,
): string | null {
  const value = requestedUrl?.trim();
  const internalOrigin = resolveMarketplaceOrigin(env);
  if (!value || !internalOrigin) return null;
  return resolveProtectedMediaFetchUrl(value, {
    publicOrigin: configuredMediaOrigin(publicMediaOrigin),
    internalOrigin,
    legacyPublicOrigins: internalOrigin === STAGING_PROTECTED_MEDIA_ORIGIN ? [LEGACY_PROTECTED_MEDIA_ORIGIN] : [],
    pathPattern: BLOG_MEDIA_PATH_PATTERN,
  });
}
