import AppShell from "@/components/layout/AppShell";
import { PlatformApprovalDataProvider, PlatformApprovalQueueScreen } from "@ihp/platform-configuration";

export default function ApprovalQueuePage() {
  return (
    <AppShell>
      <PlatformApprovalDataProvider>
        <PlatformApprovalQueueScreen />
      </PlatformApprovalDataProvider>
    </AppShell>
  );
}
