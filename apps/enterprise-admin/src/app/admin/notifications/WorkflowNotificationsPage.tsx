"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEnterpriseWorkflowNotifications } from "@/realtime/enterprise-workflow-notifications";
import {
  formatRelativeBackendTimestamp,
  formatTrainingNotificationDetails,
  handleNotificationClick,
  notificationReason,
  useRealtime,
} from "@ihp/realtime";

type EnterpriseNotificationViewItem = {
  id: string;
  notification_type: string;
  category?: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string | null;
};

export default function WorkflowNotificationsPage() {
  const state = useEnterpriseWorkflowNotifications();
  const realtime = useRealtime();
  const router = useRouter();
  const items = useMemo(() => {
    const workflowItems: EnterpriseNotificationViewItem[] = state.items.map((item) => ({
      id: item.id,
      notification_type: item.notification_type,
      category: item.category,
      title: item.title,
      message: item.message,
      metadata: item.metadata,
      is_read: item.is_read,
      created_at: item.created_at,
    }));
    const workflowIds = new Set(workflowItems.map((item) => item.id));
    const realtimeItems: EnterpriseNotificationViewItem[] = realtime.notifications
      .filter((item) => !workflowIds.has(item.id))
      .map((item) => ({
        id: item.id,
        notification_type: item.notification_type,
        category: item.category,
        title: item.title,
        message: item.body,
        metadata: item.data,
        is_read: item.is_read,
        created_at: item.created_at,
      }));

    return [...workflowItems, ...realtimeItems].sort((left, right) => {
      const leftDate = Date.parse(left.created_at ?? "");
      const rightDate = Date.parse(right.created_at ?? "");
      return (Number.isFinite(rightDate) ? rightDate : 0) - (Number.isFinite(leftDate) ? leftDate : 0);
    });
  }, [realtime.notifications, state.items]);
  const unreadCount = items.filter((item) => !item.is_read).length;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#06201c]">Notifications</h2>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              const actions: Promise<unknown>[] = [];
              if (state.items.some((item) => !item.is_read)) actions.push(state.markAllRead());
              if (realtime.notifications.some((item) => !item.is_read)) actions.push(realtime.markAllNotificationsAsRead());
              void Promise.all(actions).catch(() => undefined);
            }}
            className="rounded-xl border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {state.readError || state.readAllError ? (
        <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3 text-sm text-[#8f3b2f]">
          Unable to update notification status. Please try again.
        </p>
      ) : null}
      {realtime.notificationError ? (
        <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3 text-sm text-[#8f3b2f]">
          Unable to load the shared notification feed. Please refresh and try again.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3 text-sm text-[#8f3b2f]">
          Unable to load Enterprise workflow notifications. Please refresh and try again.
        </p>
      ) : null}
      {items.length === 0 ? (
        state.isLoading || realtime.isLoadingNotifications ? (
          <p role="status" className="text-sm text-[#52736a]">Loading notifications...</p>
        ) : (
          <p className="text-sm text-[#52736a]">No notifications.</p>
        )
      ) : (
        <div className="divide-y divide-[#edf3f0] overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white">
          {items.map((item) => {
            const reason = notificationReason({ data: item.metadata, body: item.message });
            const { trainingTitle } = formatTrainingNotificationDetails({
              notification_type: item.notification_type,
              title: item.title,
              body: item.message,
              data: item.metadata,
            });
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const markRead = state.items.some((workflowItem) => workflowItem.id === item.id)
                    ? state.markRead
                    : realtime.markNotificationAsRead;
                  handleNotificationClick(
                    { id: item.id, notification_type: item.notification_type, data: item.metadata },
                    "enterprise",
                    (id) => Promise.resolve(markRead(id)).then(() => undefined),
                    (target) => router.push(target),
                  );
                }}
                className={`block w-full p-4 text-left transition hover:bg-[#f4faf7] ${
                  item.is_read ? "bg-white" : "bg-[#f1f8f4]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-[#06201c]">{item.title}</p>
                  {item.created_at ? (
                    <span className="text-xs font-semibold text-[#7f9d94]">
                      {formatRelativeBackendTimestamp(item.created_at)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#52736a]">{item.message}</p>
                {trainingTitle ? (
                  <p className="mt-1 text-xs font-semibold text-[#1f6a58]">Training: {trainingTitle}</p>
                ) : null}
                {reason ? <p className="mt-1 text-xs text-[#8a5a00]">Reason: {reason}</p> : null}
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
