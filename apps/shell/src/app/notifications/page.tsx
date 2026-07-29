import { RealtimeCompatibilityShell as AppShell } from "@/components/layout/AppShell";
import NotificationHistoryView from "@/components/notifications/NotificationHistoryView";

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationHistoryView />
    </AppShell>
  );
}
