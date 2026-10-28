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

/** Builds an Enterprise Chat upstream URL without changing unrelated route paths. */
export function buildEnterpriseChatUpstreamUrl(proxyTarget: string, requestPath: string, search = ""): string {
  return `${proxyTarget}/api/v1/${normalizeEnterpriseChatUpstreamPath(requestPath)}${search}`;
}
