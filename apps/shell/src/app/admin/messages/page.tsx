import { EnterpriseMessagingHubScreen } from "@ihp/messaging";

import { RealtimeCompatibilityShell as AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  return (
    <AppShell>
      <EnterpriseMessagingHubScreen />
    </AppShell>
  );
}
