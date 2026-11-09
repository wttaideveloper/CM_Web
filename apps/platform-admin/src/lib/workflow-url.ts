import { resolveSafeProxyPath } from "@ihp/shared/safe-proxy-path";
import {
  isTrustedUpstreamUrl,
  normalizeUpstreamBaseUrl,
  parseOriginAllowlist,
  type EnvSource,
} from "@ihp/shared/upstream-config";

import { TRUSTED_UPSTREAM_ORIGINS_ENV } from "./marketplace-url.ts";

/** Workflow API resources the Platform Admin proxy exposes. */
export type WorkflowResource = "forms" | "workflows" | "media";

/** Why a Workflow request is refused before any upstream call (and before any token is fetched). */
export type WorkflowUrlRefusal = "not-configured" | "untrusted-origin" | "invalid-path";

/** Outcome of {@link resolveWorkflowUrl}. */
export type WorkflowUrlResult = { readonly ok: true; readonly url: URL } | { readonly ok: false; readonly reason: WorkflowUrlRefusal };

/**
 * Builds the Workflow API URL for a server-side request that carries the Super Admin bearer token.
 *
 * The target comes only from `WORKFLOW_API_BASE_URL`, never from request input, and is used only if its
 * exact origin is listed in `PLATFORM_TRUSTED_UPSTREAM_ORIGINS` (the same allowlist that guards the
 * Marketplace API; an empty list trusts nothing). Cleartext `http:` additionally requires an internal host.
 * The request path is validated and re-encoded so it cannot leave `/api/v1/<resource>/`.
 *
 * @param resource Workflow resource the route serves
 * @param segments catch-all route segments (decoded once by Next.js); empty for a collection route
 * @param search query string with or without a leading `?`
 * @param rawPathname request pathname before decoding, validated in addition to the segments
 * @returns the URL, or the reason the request must be refused without contacting any upstream
 */
export function resolveWorkflowUrl(
  resource: WorkflowResource,
  segments: readonly string[],
  search: string,
  rawPathname: string,
  env: EnvSource = process.env,
): WorkflowUrlResult {
  const base = normalizeUpstreamBaseUrl(env.WORKFLOW_API_BASE_URL);
  if (!base) return { ok: false, reason: "not-configured" };

  const origin = new URL(base);
  if (!isTrustedUpstreamUrl(origin, parseOriginAllowlist(env[TRUSTED_UPSTREAM_ORIGINS_ENV]))) {
    return { ok: false, reason: "untrusted-origin" };
  }

  const prefix = `/api/v1/${resource}`;
  const safePath = resolveSafeProxyPath(segments, { rawPathname, allowEmpty: true, upstreamPrefix: `${prefix}/` });
  if (safePath === null) return { ok: false, reason: "invalid-path" };

  // Only the origin of the configured base is used; the path is always /api/v1/<resource>[/...].
  const url = new URL(origin.origin);
  url.pathname = safePath ? `${prefix}/${safePath}` : prefix;
  url.search = search;
  return { ok: true, url };
}
