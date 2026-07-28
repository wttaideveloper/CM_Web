import AppShell from "@/components/layout/AppShell";
import NotificationHistoryView from "@/components/notifications/NotificationHistoryView";

export default function AdminNotificationsPage() {
  return (
    <AppShell>
      <NotificationHistoryView messagesRoute="/admin/messages" />
    </AppShell>
  );
}
