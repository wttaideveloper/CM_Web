"use client";

import type { ReactNode } from "react";

import { ChatAuthProvider } from "@ihp/chat-runtime";
import { RealtimeProvider } from "@ihp/realtime";

import { enterpriseRealtimeAdapter } from "@/realtime/enterprise-realtime-adapter";

export default function EnterpriseRealtimeRouteProviders({ children }: { children: ReactNode }) {
  return (
    <ChatAuthProvider>
      <RealtimeProvider adapter={enterpriseRealtimeAdapter}>{children}</RealtimeProvider>
    </ChatAuthProvider>
  );
}
