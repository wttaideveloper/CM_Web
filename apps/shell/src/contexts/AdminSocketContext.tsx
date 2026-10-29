"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useContext } from "react";

import { useAuth } from "@ihp/auth";
import { clearChatTokenSession, getGroupRealtimeAccessToken } from "@ihp/chat-runtime";

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
import { shouldUseGroupRealtimeAuth, shouldUseNormalEnterpriseRealtimeAuth } from "./realtime-routing";

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
  getToken: getGroupRealtimeAccessToken,
  clearToken: clearChatTokenSession,
  createSocket: createChatSocket,
  updatePresenceStatus,
  notificationClient,
});

export function AdminSocketProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { authenticated, authReady, user } = useAuth();
  const { canUseProviderChat, isReady: chatAuthReady } = useChatAuth();
  const useNormalEnterpriseRealtimeAuth = shouldUseNormalEnterpriseRealtimeAuth(
    pathname,
    authReady,
    authenticated,
    canUseProviderChat,
    chatAuthReady,
  );
  const useGroupRealtimeAuth = shouldUseGroupRealtimeAuth(
    pathname,
    authReady,
    authenticated,
    chatAuthReady,
    process.env.NEXT_PUBLIC_GROUP_CHAT_REALTIME_ENABLED?.trim().toLowerCase() === "true",
  );
  const useEnterpriseRealtimeAuth = useNormalEnterpriseRealtimeAuth || useGroupRealtimeAuth;
  const adapter = useEnterpriseRealtimeAuth ? enterpriseRealtimeAdapter : shellRealtimeAdapter;
  const isMessagesRoute = pathname === "/admin/messages";
  const realtimeIdentity = `${user?.userId ?? user?.id ?? ""}:${user?.membership?.tenantSlug ?? user?.membership?.tenantName ?? ""}`;

  return (
    <RealtimeProvider
      key={realtimeIdentity}
      adapter={adapter}
      enabled={isMessagesRoute ? useEnterpriseRealtimeAuth : undefined}
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
