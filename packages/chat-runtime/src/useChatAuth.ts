"use client";

import { createContext, useContext } from "react";

import type { ChatAuthContextValue } from "./types";

export const ChatAuthContext = createContext<ChatAuthContextValue | null>(null);

export function useChatAuth() {
  const context = useContext(ChatAuthContext);

  if (!context) {
    throw new Error("useChatAuth must be used within ChatAuthProvider.");
  }

  return context;
}
