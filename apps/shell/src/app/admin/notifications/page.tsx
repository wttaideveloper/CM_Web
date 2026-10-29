"use client";

import { Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EnterpriseNotificationHistoryScreen } from "@ihp/enterprise-notifications";

import { RealtimeCompatibilityShell as AppShell } from "@/components/layout/AppShell";

function AdminNotificationsContent() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-white px-6 text-sm font-semibold text-[#52736a]">Loading notifications...</main>}>
        <EnterpriseNotificationHistoryScreen audience="enterprise" messagesRoute="/admin/messages" />
      </Suspense>
    </QueryClientProvider>
  );
}

export default function AdminNotificationsPage() {
  return (
    <AppShell>
      <AdminNotificationsContent />
    </AppShell>
  );
}
