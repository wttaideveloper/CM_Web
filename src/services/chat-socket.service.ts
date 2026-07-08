import { API_BASE_URL } from "@/lib/api";
import { io, type Socket } from "socket.io-client";

export type ChatSocket = Socket;

function getSocketBaseUrl(apiBaseUrl: string = API_BASE_URL) {
  return apiBaseUrl.replace(/\/api\/v1\/?$/, "");
}

export function createChatSocket(token?: string): ChatSocket {
  const socketBaseUrl = getSocketBaseUrl();
  const socketPath = "/api/socket.io";

  return io(socketBaseUrl, {
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
