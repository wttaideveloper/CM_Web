"use client";

import { createContext, useContext } from "react";

import type { RealtimeContextValue } from "./types";

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }

  return context;
}
