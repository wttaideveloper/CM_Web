"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@ihp/auth";
import { useRouter } from "next/navigation";

import {
  browserWorkflowRequest,
  createWorkflowNotificationClient,
  formatRelativeBackendTimestamp,
  resolveNotificationTarget,
  type WorkflowNotification,
} from "@ihp/realtime";

type NotificationHistoryViewProps = {
  audience: "enterprise" | "platform";
  messagesRoute?: string;
};

const MAX_NOTIFICATION_PAGE_SIZE = 100;

async function enterpriseWorkflowRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`/api/v1/users/me${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
      ? body.detail
      : `Notification request failed (HTTP ${response.status}).`;
    throw new Error(detail);
  }
  return body as T;
}

const enterpriseNotificationClient = createWorkflowNotificationClient(enterpriseWorkflowRequest);
const platformNotificationClient = createWorkflowNotificationClient(browserWorkflowRequest);

function getNotificationConversationId(notification: WorkflowNotification): string | null {
  const candidate = notification.metadata.conversation_id ?? notification.metadata.conversationId;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function notificationCardClass(notification: WorkflowNotification): string {
  return notification.is_read ? "bg-[#fbfdfc]" : "bg-white";
}

/** Displays and updates notifications from the role-specific notification API. */
export default function EnterpriseNotificationHistoryScreen({ audience, messagesRoute }: NotificationHistoryViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const client = audience === "platform" ? platformNotificationClient : enterpriseNotificationClient;
  const queryKey = ["workflow-notification-history", audience] as const;
  const unreadCountKey = ["workflow-notification-unread-count", audience] as const;
  const history = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => client.list(pageParam, MAX_NOTIFICATION_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.total_pages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 15_000,
  });
  const unreadCount = useQuery({
    queryKey: unreadCountKey,
    queryFn: () => client.unreadCount(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const markRead = useMutation({
    mutationFn: (notificationId: string) => client.markRead(notificationId),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: unreadCountKey }),
      ]);
    },
  });
  const markAllRead = useMutation({
    mutationFn: () => client.markAllRead(),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: unreadCountKey }),
      ]);
    },
  });
  const notifications = history.data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = history.data?.pages[0]?.pagination.total ?? notifications.length;
  const unreadNotificationCount = unreadCount.data?.unread_count ?? 0;
  const notificationError = history.error ?? unreadCount.error;

  const handleNotificationClick = (notification: WorkflowNotification) => {
    const conversationId = getNotificationConversationId(notification);
    if (conversationId && messagesRoute) {
      if (notification.is_read) {
        router.push(`${messagesRoute}?conversationId=${encodeURIComponent(conversationId)}`);
      } else {
        markRead.mutate(notification.id, {
          onSuccess: () => router.push(`${messagesRoute}?conversationId=${encodeURIComponent(conversationId)}`),
        });
      }
      return;
    }

    const target = resolveNotificationTarget({
      notification_type: notification.notification_type,
      category: notification.category,
      metadata: notification.metadata,
      data: notification.metadata,
      title: notification.title,
      body: notification.message,
    }, audience);
    const navigate = () => { if (target) router.push(target); };
    if (notification.is_read) navigate();
    else markRead.mutate(notification.id, { onSuccess: navigate });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#06201c]">Notifications</h2>
        <p className="mt-1 text-sm text-[#52736a]">View notifications sent to your account.</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf3f0] px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[#06201c]">
              {totalCount} notification{totalCount === 1 ? "" : "s"}
            </h3>
            <p className="mt-1 text-sm text-[#52736a]">{unreadNotificationCount} unread notifications.</p>
          </div>
          {unreadNotificationCount > 0 ? (
            <button
              type="button"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#175646] disabled:opacity-60"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {notificationError ? (
          <div className="px-5 py-5 text-sm text-[#b42318]" role="alert">
            Unable to load notifications. Please refresh and try again.
          </div>
        ) : history.isLoading || unreadCount.isLoading ? (
          <div className="px-5 py-8 text-sm text-[#52736a]" role="status">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-sm text-[#52736a]">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-[#edf3f0]">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`flex w-full gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[#f4faf7] ${notificationCardClass(notification)}`}
              >
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${notification.is_read ? "bg-[#d0dbd7]" : "bg-[#1f6a58]"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#06201c]">{notification.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#52736a]">{notification.message}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#7f9d94]">
                      {formatRelativeBackendTimestamp(notification.created_at)}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#7f9d94]">
                    {notification.category || notification.notification_type}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {history.hasNextPage ? (
          <div className="border-t border-[#edf3f0] px-5 py-4">
            <button
              type="button"
              disabled={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
              className="inline-flex items-center rounded-full bg-[#f7fbf9] px-4 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef7f2] disabled:opacity-60"
            >
              {history.isFetchingNextPage ? "Loading..." : "Load more notifications"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
