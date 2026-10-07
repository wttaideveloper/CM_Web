"use client";

import { Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { RealtimeCompatibilityShell as AppShell } from "@/components/layout/AppShell";
import { EnterpriseNotificationHistoryScreen } from "@ihp/enterprise-notifications";

function NotificationsContent() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-white px-6 text-sm font-semibold text-[#52736a]">Loading notifications...</main>}>
        <EnterpriseNotificationHistoryScreen audience="platform" />
      </Suspense>
    </QueryClientProvider>
  );
}

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsContent />
    </AppShell>
  );
}
