import { PlatformDashboardScreen } from "@ihp/platform-dashboard";

import PlatformAdminShell from "@/components/PlatformAdminShell";

export default function PlatformDashboardPage() {
  return (
    <PlatformAdminShell>
      <PlatformDashboardScreen
        approvalQueueHref="/approval-queue"
        newEnterpriseHref="/enterprises/create"
      />
    </PlatformAdminShell>
  );
}
