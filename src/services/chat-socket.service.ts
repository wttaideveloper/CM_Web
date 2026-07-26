import { CHAT_SOCKET_URL } from "@/lib/chat-api";
import { io, type Socket } from "socket.io-client";

export type ChatSocket = Socket;

export function createChatSocket(token?: string): ChatSocket {
  const socketPath = "/api/socket.io";

  return io(CHAT_SOCKET_URL, {
    path: socketPath,
    autoConnect: false,
    transports: ["polling"],
    timeout: 10000,
    auth: token
      ? {
          token,
        }
      : undefined,
  });
}
