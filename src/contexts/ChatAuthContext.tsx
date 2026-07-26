"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { clearChatTokenSession, setChatSessionEnabled } from "@/services/chat-token.service";

type ChatAuthContextValue = {
  canUseProviderChat: boolean;
  isReady: boolean;
};

const ChatAuthContext = createContext<ChatAuthContextValue | null>(null);

export function ChatAuthProvider({ children }: { children: ReactNode }) {
  const { authenticated, user } = useAuth();
  const canUseProviderChat = authenticated && user?.membership?.tenantRole === "internal_user";
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

export function useChatAuth() {
  const context = useContext(ChatAuthContext);

  if (!context) {
    throw new Error("useChatAuth must be used within ChatAuthProvider.");
  }

  return context;
}
