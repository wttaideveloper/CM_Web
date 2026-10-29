import { io, type Socket } from "socket.io-client";

import { CHAT_SOCKET_URL } from "./config";

export type ChatSocket = Socket;

export function createChatSocket(token?: string): ChatSocket {
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
