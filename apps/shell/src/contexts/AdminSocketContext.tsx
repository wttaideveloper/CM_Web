"use client";

import { type ReactNode, useContext } from "react";

import {
  defineRealtimeAdapter,
  RealtimeContext,
  RealtimeProvider,
  type RealtimeContextValue,
} from "@ihp/realtime";

import { updatePresenceStatus } from "@/services/chat.service";
import { createChatSocket } from "@/services/chat-socket.service";
import {
  clearMarketplaceDemoSession,
  getMarketplaceChatToken,
  getMarketplaceDemoSession,
} from "@/services/marketplace-demo-auth.service";
import { notificationClient } from "@/services/notification.service";

const shellRealtimeAdapter = defineRealtimeAdapter({
  shouldConnect: (pathname) =>
    Boolean(getMarketplaceDemoSession()) && pathname !== "/" && !pathname.startsWith("/auth"),
  getToken: getMarketplaceChatToken,
  clearToken: clearMarketplaceDemoSession,
  createSocket: createChatSocket,
  updatePresenceStatus,
  notificationClient,
});

export function AdminSocketProvider({ children }: { children: ReactNode }) {
  return <RealtimeProvider adapter={shellRealtimeAdapter}>{children}</RealtimeProvider>;
}

export function useAdminSocket() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useAdminSocket must be used within AdminSocketProvider");
  }

  return context;
}

export type AdminSocketContextValue = RealtimeContextValue;
