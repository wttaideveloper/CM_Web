import { RealtimeCompatibilityShell as AppShell } from "@/components/layout/AppShell";
import { EnterpriseNotificationHistoryScreen } from "@ihp/enterprise-notifications";

export default function NotificationsPage() {
  return (
    <AppShell>
      <EnterpriseNotificationHistoryScreen />
    </AppShell>
  );
}
