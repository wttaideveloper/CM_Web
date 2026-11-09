import { resolveChatSocketUrl } from "./chat-socket-url";

export const CHAT_API_BASE_URL =
  process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || "/api/chat";

/**
 * Browser-reachable Socket.IO origin, or `null` when `NEXT_PUBLIC_CHAT_SOCKET_URL` is not
 * configured. There is no default host: an unconfigured deployment keeps realtime disabled
 * rather than connecting to a legacy backend. Referenced as a literal so Next.js inlines it.
 */
export const CHAT_SOCKET_URL: string | null = resolveChatSocketUrl(process.env.NEXT_PUBLIC_CHAT_SOCKET_URL);

export const CHAT_GATEWAY_MODE = CHAT_API_BASE_URL.startsWith("/");
