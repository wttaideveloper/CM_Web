import { authenticatedFetch } from "@ihp/auth";
import {
  createWorkflowNotificationClient,
  type NotificationClient,
  type NotificationHistoryResponse,
  type NotificationItem,
  type NotificationPagination,
  type NotificationUnreadCounts,
  type WorkflowNotification,
} from "@ihp/realtime";

async function workflowRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`/api/v1/users/me${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
        ? body.detail
        : `Notification request failed (HTTP ${response.status}).`;
    throw new Error(detail);
  }

  return body as T;
}

function toNotificationItem(notification: WorkflowNotification): NotificationItem {
  return {
    id: notification.id,
    notification_type: notification.notification_type,
    ...(notification.category ? { category: notification.category } : {}),
    metadata: notification.metadata,
    title: notification.title,
    body: notification.message,
    data: notification.metadata,
    is_read: notification.is_read,
    created_at: notification.created_at,
  };
}

const workflowNotificationClient = createWorkflowNotificationClient(workflowRequest);

const notificationClient: NotificationClient = {
  async getUnreadCounts(): Promise<NotificationUnreadCounts> {
    const response = await workflowNotificationClient.unreadCount();
    const unreadCount = Number(response.unread_count);

    if (!Number.isFinite(unreadCount) || unreadCount < 0) {
      throw new Error("Invalid unread notification count response.");
    }

    return {
      unread_messages: 0,
      unread_notifications: unreadCount,
      total_unread: unreadCount,
    };
  },

  async getNotificationHistory(page = 1, pageSize = 20): Promise<NotificationHistoryResponse> {
    const response = await workflowNotificationClient.list(page, pageSize);
    const pagination: NotificationPagination = response.pagination;

    return {
      items: response.items.map(toNotificationItem),
      pagination,
    };
  },

  async markNotificationRead(notificationId: string): Promise<NotificationItem> {
    const response = await workflowNotificationClient.markRead(notificationId);
    return toNotificationItem(response);
  },

  async markAllNotificationsRead(): Promise<void> {
    await workflowNotificationClient.markAllRead();
  },

  async markConversationNotificationsRead(conversationId: string): Promise<void> {
    await workflowRequest(`/notifications/conversation/${encodeURIComponent(conversationId)}/read`, {
      method: "PATCH",
    });
  },
};

export { notificationClient };

export const getUnreadCounts = notificationClient.getUnreadCounts;
export const getNotificationHistory = notificationClient.getNotificationHistory;
export const markNotificationRead = notificationClient.markNotificationRead;
export const markAllNotificationsRead = notificationClient.markAllNotificationsRead;
export const markConversationNotificationsRead = notificationClient.markConversationNotificationsRead;

export type {
  NotificationHistoryResponse,
  NotificationItem,
  NotificationPagination,
  NotificationUnreadCounts,
} from "@ihp/realtime";
