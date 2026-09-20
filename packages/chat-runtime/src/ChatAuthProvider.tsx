"use client";

import { useAuth } from "@ihp/auth";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { clearChatTokenSession, setChatSessionEnabled } from "./chat-token";
import { ChatAuthContext } from "./useChatAuth";

export function ChatAuthProvider({ children }: { children: ReactNode }) {
  const { authenticated, authReady, user } = useAuth();
  const canUseProviderChat = authenticated && authReady && user?.membership?.tenantRole === "internal_user";
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setChatSessionEnabled(canUseProviderChat);
    setIsReady(true);

    if (!canUseProviderChat) {
      clearChatTokenSession();
    }
  }, [canUseProviderChat]);

  const value = useMemo(
    () => ({ canUseProviderChat, isReady }),
    [canUseProviderChat, isReady],
  );

  return <ChatAuthContext.Provider value={value}>{children}</ChatAuthContext.Provider>;
}
