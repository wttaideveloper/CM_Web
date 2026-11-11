export type BlogsQueryValue = string | number | undefined;

/**
 * Resolves the browser-safe base for public Blog API requests.
 *
 * An explicitly configured base remains supported for existing deployments.
 * When it is omitted, the same-origin route is used so the active app's BFF
 * can select the correct backend without exposing a stale Chat origin.
 */
export function resolveBlogsApiBase(configuredBase?: string): string {
  return configuredBase?.trim() || "/api/v1";
}

/** Serializes the supported Blog query parameters without emitting empty values. */
export function buildBlogsApiQuery(
  params: Record<string, BlogsQueryValue>,
): string {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== "") {
      values.set(key, String(value));
    }
  });
  const encoded = values.toString();
  return encoded ? `?${encoded}` : "";
}

/** Builds a Blog API URL from the configured base, path, and query parameters. */
export function buildBlogsApiUrl(
  base: string,
  path: string,
  params?: Record<string, BlogsQueryValue>,
): string {
  return `${base.replace(/\/$/, "")}${path}${params ? buildBlogsApiQuery(params) : ""}`;
}
