"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, Suspense } from "react";

import AppShell from "@/components/layout/AppShell";
import { PlatformBlogGovernanceScreen } from "@ihp/platform-configuration";

export default function BlogGovernancePage() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <Suspense fallback={<p role="status" className="mx-auto w-full max-w-6xl px-4 py-12 text-center text-sm font-semibold text-[#52736a]">Loading governance controls...</p>}>
          <PlatformBlogGovernanceScreen />
        </Suspense>
      </AppShell>
    </QueryClientProvider>
  );
}
