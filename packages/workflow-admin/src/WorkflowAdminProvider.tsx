"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

type WorkflowAdminProviderProps = {
  children: ReactNode;
};

/** Provides isolated React Query state to a host that does not already own it. */
export function WorkflowAdminProvider({ children }: WorkflowAdminProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
