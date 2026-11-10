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

/** Keeps the existing production Chat origin as the last-resort compatibility fallback. */
export const DEFAULT_ENTERPRISE_CHAT_PROXY_TARGET = "https://chat.wisdomtooth.tech";

/** Resolves the shared Enterprise Chat origin without adding an API path. */
export function resolveEnterpriseChatProxyTarget(
  configuredTarget?: string,
  configuredChatApi?: string,
): string {
  const proxyTarget = configuredTarget?.trim();
  if (proxyTarget) {
    return proxyTarget.replace(/\/$/, "");
  }

  const chatApiBase = configuredChatApi?.trim();
  if (chatApiBase) {
    return chatApiBase
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/$/, "");
  }

  return DEFAULT_ENTERPRISE_CHAT_PROXY_TARGET;
}

/** Builds the authenticated Chat-token endpoint from an origin-only proxy target. */
export function buildEnterpriseChatTokenUpstreamUrl(proxyTarget: string): string {
  return `${proxyTarget}/api/v1/auth/chat-token`;
}

/** Builds an Enterprise Chat upstream URL without changing unrelated route paths. */
export function buildEnterpriseChatUpstreamUrl(proxyTarget: string, requestPath: string, search = ""): string {
  return `${proxyTarget}/api/v1/${normalizeEnterpriseChatUpstreamPath(requestPath)}${search}`;
}
