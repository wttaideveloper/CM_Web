"use client";

import type { ReactNode } from "react";

import { AdminSocketProvider } from "@/contexts/AdminSocketContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return <AdminSocketProvider>{children}</AdminSocketProvider>;
}
