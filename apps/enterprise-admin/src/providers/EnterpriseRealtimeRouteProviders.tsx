"use client";

import type { ReactNode } from "react";

import { ChatAuthProvider } from "@ihp/chat-runtime";
import { useAuth } from "@ihp/auth";
import { RealtimeProvider } from "@ihp/realtime";

import { enterpriseRealtimeAdapter } from "@/realtime/enterprise-realtime-adapter";

export default function EnterpriseRealtimeRouteProviders({ children }: { children: ReactNode }) {
  const { authReady, user } = useAuth();
  return (
    <ChatAuthProvider>
      <RealtimeProvider adapter={enterpriseRealtimeAdapter} enabled={authReady && Boolean(user)}>{children}</RealtimeProvider>
    </ChatAuthProvider>
  );
}
