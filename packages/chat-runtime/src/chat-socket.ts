import { io, type Socket } from "socket.io-client";

import { CHAT_SOCKET_URL } from "./config";

export type ChatSocket = Socket;

/**
 * Creates the chat Socket.IO client.
 *
 * @throws {Error} when `NEXT_PUBLIC_CHAT_SOCKET_URL` is not configured. Callers must treat this
 * as "realtime unavailable"; the variable name is included so the cause is obvious in the console.
 */
export function createChatSocket(token?: string): ChatSocket {
  if (!CHAT_SOCKET_URL) {
    throw new Error("Chat realtime is not configured: set NEXT_PUBLIC_CHAT_SOCKET_URL at build time.");
  }

  const socketPath = "/api/socket.io";
  const socket = io(CHAT_SOCKET_URL, {
    path: socketPath,
    autoConnect: false,
    auth: token ? { token } : undefined,
    withCredentials: true,
    timeout: 10000,
  });
  return socket;
}
