"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import AppShell from "@/components/layout/AppShell";
import { PlatformCategoriesScreen } from "@ihp/platform-configuration";

export default function CategoriesPage() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <PlatformCategoriesScreen />
      </AppShell>
    </QueryClientProvider>
  );
}
