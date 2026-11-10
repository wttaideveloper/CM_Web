export type CommerceQueryValue = string | number | boolean | null | undefined;

/** Builds a same-origin API URL while omitting undefined and null filters. */
export function buildCommerceUrl(
  path: string,
  query: object = {},
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1",
): string {
  const normalizedPath = path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) searchParams.set(key, String(value));
  }

  const search = searchParams.toString();
  return `${baseUrl.replace(/\/+$/, "")}${normalizedPath}${search ? `?${search}` : ""}`;
}

/** Encodes a required path segment for a Commerce endpoint. */
export function commercePathSegment(value: string, name: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required.`);
  return encodeURIComponent(trimmed);
}
