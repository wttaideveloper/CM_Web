import { clearChatTokenSession, createChatSocket, getChatToken } from "@ihp/chat-runtime";
import { authenticatedFetch } from "@ihp/auth";
import { updatePresenceStatus } from "@ihp/messaging";
import {
  createWorkflowNotificationClient,
  defineRealtimeAdapter,
  type NotificationClient,
  type WorkflowNotification,
} from "@ihp/realtime";

const MAX_NOTIFICATION_PAGE_SIZE = 100;

async function requestWorkflowNotification<T>(path: string, init?: RequestInit): Promise<T> {
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

const workflowNotificationClient = createWorkflowNotificationClient(requestWorkflowNotification);

const enterpriseNotificationClient: NotificationClient = {
  getUnreadCounts: async () => {
    const { unread_count: unreadNotifications } = await workflowNotificationClient.unreadCount();
    return {
      unread_messages: 0,
      unread_notifications: unreadNotifications,
      total_unread: unreadNotifications,
    };
  },
  getNotificationHistory: async (page = 1, pageSize = 20) => {
    const history = await workflowNotificationClient.list(page, pageSize);
    return {
      items: history.items.map((item) => ({
        id: item.id,
        notification_type: item.notification_type,
        category: item.category,
        metadata: item.metadata,
        title: item.title,
        body: item.message,
        data: item.metadata,
        is_read: item.is_read,
        created_at: item.created_at,
      })),
      pagination: history.pagination,
    };
  },
  markNotificationRead: (notificationId) => workflowNotificationClient.markRead(notificationId),
  markAllNotificationsRead: async () => {
    await workflowNotificationClient.markAllRead();
  },
  markConversationNotificationsRead: async (conversationId) => {
    const matchingNotifications: WorkflowNotification[] = [];
    const firstPage = await workflowNotificationClient.list(1, MAX_NOTIFICATION_PAGE_SIZE);
    matchingNotifications.push(...firstPage.items.filter((item) => {
      const itemConversationId = item.metadata.conversation_id ?? item.metadata.conversationId;
      return !item.is_read && itemConversationId === conversationId;
    }));

    for (let page = 2; page <= firstPage.pagination.total_pages; page += 1) {
      const history = await workflowNotificationClient.list(page, MAX_NOTIFICATION_PAGE_SIZE);
      matchingNotifications.push(...history.items.filter((item) => {
        const itemConversationId = item.metadata.conversation_id ?? item.metadata.conversationId;
        return !item.is_read && itemConversationId === conversationId;
      }));
    }

    await Promise.all(matchingNotifications.map((item) => workflowNotificationClient.markRead(item.id)));
  },
};

let enterpriseNotificationToken: { accessToken: string; expiresAt: number } | null = null;

/** Gets a cached short-lived socket token without enabling provider chat capabilities. */
async function getEnterpriseNotificationToken(): Promise<string> {
  if (enterpriseNotificationToken && enterpriseNotificationToken.expiresAt - Date.now() > 30_000) {
    return enterpriseNotificationToken.accessToken;
  }

  const tokenResponse = await getChatToken();
  enterpriseNotificationToken = {
    accessToken: tokenResponse.access_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
  };
  return enterpriseNotificationToken.accessToken;
}

function clearEnterpriseNotificationToken(): void {
  enterpriseNotificationToken = null;
  clearChatTokenSession();
}

export const enterpriseRealtimeAdapter = defineRealtimeAdapter({
  shouldConnect: () => true,
  getToken: getEnterpriseNotificationToken,
  clearToken: clearEnterpriseNotificationToken,
  createSocket: createChatSocket,
  updatePresenceStatus,
  notificationClient: enterpriseNotificationClient,
  notificationsOnly: true,
});
