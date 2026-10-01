import { Suspense } from "react";

import AppShell from "@/components/layout/AppShell";
import { PlatformApprovalDataProvider, PlatformApprovalQueueScreen } from "@ihp/platform-configuration";

export default function ApprovalQueuePage() {
  return (
    <AppShell>
      <PlatformApprovalDataProvider>
        <Suspense fallback={<p role="status" className="mx-auto w-full max-w-6xl px-4 py-12 text-center text-sm font-semibold text-[#52736a]">Loading approval queue...</p>}>
          <PlatformApprovalQueueScreen />
        </Suspense>
      </PlatformApprovalDataProvider>
    </AppShell>
  );
}
