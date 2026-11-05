"use client";

import type { ReactNode } from "react";

import { ChatAuthProvider } from "@ihp/chat-runtime";

export default function EnterpriseRealtimeRouteProviders({ children }: { children: ReactNode }) {
  return <ChatAuthProvider>{children}</ChatAuthProvider>;
}
