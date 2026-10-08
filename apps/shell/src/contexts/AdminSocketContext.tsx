"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useContext } from "react";

import { useAuth } from "@ihp/auth";
import { clearChatTokenSession, getChatAccessToken } from "@ihp/chat-runtime";

import {
  defineRealtimeAdapter,
  RealtimeContext,
  RealtimeProvider,
  type RealtimeContextValue,
} from "@ihp/realtime";

import { updatePresenceStatus } from "@/services/chat.service";
import { createChatSocket } from "@/services/chat-socket.service";
import { useChatAuth } from "@/contexts/ChatAuthContext";
import {
  clearMarketplaceDemoSession,
  getMarketplaceChatToken,
  getMarketplaceDemoSession,
} from "@/services/marketplace-demo-auth.service";
import { notificationClient } from "@/services/notification.service";
import { shouldUseNormalEnterpriseRealtimeAuth } from "./realtime-routing";

const shellRealtimeAdapter = defineRealtimeAdapter({
  shouldConnect: (pathname) =>
    Boolean(getMarketplaceDemoSession()) && pathname !== "/" && !pathname.startsWith("/auth"),
  getToken: getMarketplaceChatToken,
  clearToken: clearMarketplaceDemoSession,
  createSocket: createChatSocket,
  updatePresenceStatus,
  notificationClient,
});

const enterpriseRealtimeAdapter = defineRealtimeAdapter({
  shouldConnect: () => true,
  getToken: getChatAccessToken,
  clearToken: clearChatTokenSession,
  createSocket: createChatSocket,
  updatePresenceStatus,
  notificationClient,
});

export function AdminSocketProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { authenticated, authReady } = useAuth();
  const { canUseProviderChat, isReady: chatAuthReady } = useChatAuth();
  const useNormalEnterpriseRealtimeAuth = shouldUseNormalEnterpriseRealtimeAuth(
    pathname,
    authReady,
    authenticated,
    canUseProviderChat,
    chatAuthReady,
  );
  const adapter = useNormalEnterpriseRealtimeAuth ? enterpriseRealtimeAdapter : shellRealtimeAdapter;

  return (
    <RealtimeProvider
      adapter={adapter}
      enabled={useNormalEnterpriseRealtimeAuth || undefined}
    >
      {children}
    </RealtimeProvider>
  );
}

export function useAdminSocket() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useAdminSocket must be used within AdminSocketProvider");
  }

  return context;
}

export type AdminSocketContextValue = RealtimeContextValue;
