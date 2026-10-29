export const CHAT_API_BASE_URL =
  process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || "/api/chat";

export const CHAT_SOCKET_URL =
  process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || "https://chat.wisdomtooth.tech";

export const CHAT_GATEWAY_MODE = CHAT_API_BASE_URL.startsWith("/");
