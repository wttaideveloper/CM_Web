type CommerceRouteQuery = Record<string, string | string[] | undefined>;

/** Builds the thin Shell-to-Platform redirect URL for a Commerce route. */
export function buildPlatformCommerceUrl(
  platformOrigin: string,
  section: readonly string[] | undefined,
  query: CommerceRouteQuery = {},
) {
  const encodedSection = section?.map((segment) => encodeURIComponent(segment)).join("/");
  const url = new URL(encodedSection ? `/commerce/${encodedSection}` : "/commerce", platformOrigin);

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        url.searchParams.append(key, entry);
      }
    } else if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}
