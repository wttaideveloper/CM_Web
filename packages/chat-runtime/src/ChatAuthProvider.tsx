"use client";

import { useAuth } from "@ihp/auth";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { clearChatTokenSession, setChatSessionEnabled, setChatSessionIdentity } from "./chat-token";
import { ChatAuthContext } from "./useChatAuth";

export function ChatAuthProvider({ children }: { children: ReactNode }) {
  const { authenticated, authReady, user } = useAuth();
  const canUseProviderChat = authenticated && authReady && user?.membership?.tenantRole === "internal_user";
  const chatUserId = user?.id ?? user?.userId ?? null;
  const chatTenantId = user?.membership?.tenantSlug ?? null;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setChatSessionEnabled(canUseProviderChat);
    setChatSessionIdentity(chatUserId, chatTenantId);
    setIsReady(true);

    if (!canUseProviderChat) {
      clearChatTokenSession();
    }
  }, [canUseProviderChat, chatTenantId, chatUserId]);

  const value = useMemo(
    () => ({ canUseProviderChat, isReady }),
    [canUseProviderChat, isReady],
  );

  return <ChatAuthContext.Provider value={value}>{children}</ChatAuthContext.Provider>;
}
