const APPROVED_PLATFORM_API_HOSTS = new Set([
  "chat.wisdomtooth.tech",
  "marketplace-api.wisdomtoothstage.tech",
]);

type PlatformApiUrlOptions = {
  allowLocalhost?: boolean;
};

/**
 * Returns a safe Platform API URL for the approved production or staging origin.
 * Userinfo, explicit ports, non-HTTPS protocols, and all other hosts are rejected.
 */
export function getAllowedPlatformApiUrl(
  value: string | null | undefined,
  options: PlatformApiUrlOptions = {},
): URL | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (options.allowLocalhost && isLocalhost) {
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
      return url;
    }
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.port
      || url.hash
      || !APPROVED_PLATFORM_API_HOSTS.has(url.hostname)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
