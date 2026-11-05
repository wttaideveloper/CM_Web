/** Keeps chat message and upload collections aligned with their trailing-slash API contracts. */
export function normalizeChatUpstreamPath(requestPath: string): string {
  const pathWithoutLeadingSlash = requestPath.replace(/^\/+/, "");

  return pathWithoutLeadingSlash === "messages" || pathWithoutLeadingSlash === "messages/"
    || pathWithoutLeadingSlash === "uploads" || pathWithoutLeadingSlash === "uploads/"
    ? `${pathWithoutLeadingSlash.replace(/\/$/, "")}/`
    : pathWithoutLeadingSlash;
}
