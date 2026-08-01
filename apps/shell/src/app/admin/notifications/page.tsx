import { RealtimeCompatibilityShell as AppShell } from "@/components/layout/AppShell";
import { EnterpriseNotificationHistoryScreen } from "@ihp/enterprise-notifications";

export default function AdminNotificationsPage() {
  return (
    <AppShell>
      <EnterpriseNotificationHistoryScreen messagesRoute="/admin/messages" />
    </AppShell>
  );
}
