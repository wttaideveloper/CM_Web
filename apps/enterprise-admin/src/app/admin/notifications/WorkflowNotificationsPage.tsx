"use client";

import { useEnterpriseWorkflowNotifications } from "@/realtime/enterprise-workflow-notifications";
import {
  formatRelativeBackendTimestamp,
  formatTrainingNotificationDetails,
  notificationReason,
  resolveNotificationTarget,
} from "@ihp/realtime";

export default function WorkflowNotificationsPage() {
  const state = useEnterpriseWorkflowNotifications();
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#06201c]">Notifications</h2>
        {state.unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void state.markAllRead()}
            className="rounded-xl border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {state.isLoading ? (
        <p className="text-sm text-[#52736a]">Loading notifications...</p>
      ) : state.error ? (
        <p role="alert" className="text-sm text-[#b42318]">Unable to load notifications.</p>
      ) : state.items.length === 0 ? (
        <p className="text-sm text-[#52736a]">No notifications.</p>
      ) : (
        <div className="divide-y divide-[#edf3f0] overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white">
          {state.items.map((item) => {
            const target = resolveNotificationTarget(
              { notification_type: item.notification_type, data: item.metadata },
              "enterprise",
            );
            const reason = notificationReason({ data: item.metadata, body: item.message });
            const { trainingTitle, learnerSummary } = formatTrainingNotificationDetails({
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
                  void state.markRead(item.id);
                  if (target) window.location.assign(target);
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
                {learnerSummary ? (
                  <p className="mt-0.5 text-xs text-[#52736a]">Enrolled learner: {learnerSummary}</p>
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
