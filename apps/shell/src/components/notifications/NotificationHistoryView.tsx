"use client";

import { useRouter } from "next/navigation";

import { useAdminSocket } from "@/contexts/AdminSocketContext";

type NotificationLike = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string | null;
};

type NotificationHistoryViewProps = {
  messagesRoute?: string;
};

function getNotificationConversationId(notification: NotificationLike): string | null {
  const candidate = notification.data.conversation_id ?? notification.data.conversationId;

  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

function formatNotificationTime(value: string | null) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function cardClass(item: NotificationLike) {
  return item.is_read ? "bg-[#fbfdfc]" : "bg-white";
}

export default function NotificationHistoryView({ messagesRoute }: NotificationHistoryViewProps) {
  const router = useRouter();
  const {
    notifications,
    unreadNotificationCount,
    unreadMessageCount,
    totalUnreadCount,
    notificationPagination,
    isLoadingNotifications,
    notificationError,
    loadMoreNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAdminSocket();

  const hasMoreNotifications =
    notificationPagination !== null &&
    notificationPagination.page < notificationPagination.total_pages;

  const handleNotificationClick = (notification: NotificationLike) => {
    void markNotificationAsRead(notification.id).catch(() => undefined);

    const conversationId = getNotificationConversationId(notification);
    if (!conversationId || !messagesRoute) {
      return;
    }

    router.push(`${messagesRoute}?conversationId=${encodeURIComponent(conversationId)}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#06201c]">Notifications</h2>
        <p className="mt-1 text-sm text-[#52736a]">
          View platform alerts and message activity from the shared notification feed.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf3f0] px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[#06201c]">
              {notifications.length} notification{notifications.length === 1 ? "" : "s"}
            </h3>
            <p className="mt-1 text-sm text-[#52736a]">
              {unreadNotificationCount} unread notifications, {unreadMessageCount} unread messages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#16825b]">
              Total unread: {totalUnreadCount}
            </span>
            {unreadNotificationCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  void markAllNotificationsAsRead().catch(() => undefined);
                }}
                className="rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#175646]"
              >
                Mark all read
              </button>
            ) : null}
          </div>
        </div>

        {isLoadingNotifications ? (
          <div className="px-5 py-8 text-sm text-[#52736a]">Loading notifications...</div>
        ) : notificationError ? (
          <div className="px-5 py-8 text-sm text-[#b42318]">{notificationError}</div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-sm text-[#52736a]">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-[#edf3f0]">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNotificationClick(item)}
                className={`flex w-full gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[#f4faf7] ${cardClass(
                  item,
                )}`}
              >
                <span
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                    item.is_read ? "bg-[#d0dbd7]" : "bg-[#1f6a58]"
                  }`}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#06201c]">{item.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#52736a]">{item.body}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#7f9d94]">
                      {formatNotificationTime(item.created_at)}
                    </span>
                  </span>

                  <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#7f9d94]">
                    {item.notification_type}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {hasMoreNotifications ? (
          <div className="border-t border-[#edf3f0] px-5 py-4">
            <button
              type="button"
              onClick={() => {
                void loadMoreNotifications().catch(() => undefined);
              }}
              className="inline-flex items-center rounded-full bg-[#f7fbf9] px-4 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef7f2]"
            >
              Load more notifications
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
