/**
 * Validates the configured Socket.IO base URL.
 *
 * There is intentionally no fallback host (handbook §14): when the value is unset, empty or
 * malformed the result is `null` and realtime stays disabled instead of silently connecting
 * to a legacy or foreign backend.
 *
 * @returns the trimmed URL when it is an absolute http(s)/ws(s) URL without credentials, else `null`
 */
export function resolveChatSocketUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const isSocketScheme = ["https:", "http:", "wss:", "ws:"].includes(url.protocol);
    return isSocketScheme && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}
