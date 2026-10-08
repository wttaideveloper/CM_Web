/** Keeps only the chat message collection aligned with its trailing-slash API contract. */
export function normalizeChatUpstreamPath(requestPath: string): string {
  const pathWithoutLeadingSlash = requestPath.replace(/^\/+/, "");

  return pathWithoutLeadingSlash === "messages" || pathWithoutLeadingSlash === "messages/"
    ? "messages/"
    : pathWithoutLeadingSlash;
}
