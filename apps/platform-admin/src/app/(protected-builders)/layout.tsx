"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkflowAdminProvider } from "@ihp/workflow-admin";
import { useState, type ReactNode } from "react";

import PlatformBuilderAuthGate from "@/components/PlatformBuilderAuthGate";

/** Mounts Web Auth for the protected Platform builder routes. */
export default function ProtectedBuildersLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <WorkflowAdminProvider>
        <PlatformBuilderAuthGate>{children}</PlatformBuilderAuthGate>
      </WorkflowAdminProvider>
    </QueryClientProvider>
  );
}
