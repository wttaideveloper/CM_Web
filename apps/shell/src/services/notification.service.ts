import { requestJson, requestResponse } from "@/services/api-client";

export interface NotificationUnreadCounts {
  unread_messages: number;
  unread_notifications: number;
  total_unread: number;
}

export interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface NotificationHistoryResponse {
  items: NotificationItem[];
  pagination: NotificationPagination;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNotificationItem(candidate: unknown): NotificationItem | null {
  if (!isRecord(candidate) || typeof candidate.id !== "string") {
    return null;
  }

  const data = isRecord(candidate.data) ? candidate.data : {};

  return {
    id: candidate.id,
    notification_type:
      typeof candidate.notification_type === "string" ? candidate.notification_type : "unknown",
    title: typeof candidate.title === "string" ? candidate.title : "",
    body: typeof candidate.body === "string" ? candidate.body : "",
    data,
    is_read: Boolean(candidate.is_read),
    created_at: typeof candidate.created_at === "string" ? candidate.created_at : new Date().toISOString(),
  };
}

function parseCountsResponse(response: unknown): NotificationUnreadCounts | null {
  if (!isRecord(response)) {
    return null;
  }

  const unreadMessages = Number(response.unread_messages);
  const unreadNotifications = Number(response.unread_notifications);
  const totalUnread = Number(response.total_unread);

  if ([unreadMessages, unreadNotifications, totalUnread].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    unread_messages: unreadMessages,
    unread_notifications: unreadNotifications,
    total_unread: totalUnread,
  };
}

export async function getUnreadCounts(): Promise<NotificationUnreadCounts> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] unread-count request");
  }

  const response = await requestJson<unknown>("/notifications/unread-count");
  const counts = parseCountsResponse(response);

  if (!counts) {
    throw new Error("Invalid unread count response");
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] unread-count success", counts);
  }

  return counts;
}

export async function getNotificationHistory(
  page = 1,
  pageSize = 20,
): Promise<NotificationHistoryResponse> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] history request", {
      page,
      page_size: pageSize,
    });
  }

  const searchParams = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await requestJson<unknown>(`/notifications/history?${searchParams.toString()}`);

  if (!isRecord(response) || !Array.isArray(response.items) || !isRecord(response.pagination)) {
    throw new Error("Invalid notification history response");
  }

  const items = response.items
    .map(normalizeNotificationItem)
    .filter((item): item is NotificationItem => item !== null);

  const pagination = {
    total: Number(response.pagination.total) || 0,
    page: Number(response.pagination.page) || page,
    page_size: Number(response.pagination.page_size) || pageSize,
    total_pages: Number(response.pagination.total_pages) || 0,
  };

  const result = {
    items,
    pagination,
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] history success", {
      page: result.pagination.page,
      page_size: result.pagination.page_size,
      total: result.pagination.total,
      total_pages: result.pagination.total_pages,
      items: result.items.length,
    });
  }

  return result;
}

async function readNotificationResponse(path: string) {
  const response = await requestResponse(path, {
    method: "PATCH",
  });

  const body = await response.text().catch(() => "");
  let json: unknown = null;

  if (body) {
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
    json,
  };
}

export async function markNotificationRead(notificationId: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] single read request", {
      notification_id: notificationId,
    });
  }

  const response = await readNotificationResponse(`/notifications/${encodeURIComponent(notificationId)}/read`);

  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Notifications] single read failure", {
        notification_id: notificationId,
        status: response.status,
      });
    }

    throw new Error(response.body || `Request failed with status ${response.status}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] single read success", {
      notification_id: notificationId,
      status: response.status,
    });
  }

  return response.json;
}

export async function markAllNotificationsRead() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] read-all request");
  }

  const response = await readNotificationResponse("/notifications/read-all");

  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Notifications] read-all failure", {
        status: response.status,
      });
    }

    throw new Error(response.body || `Request failed with status ${response.status}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] read-all success", {
      status: response.status,
      marked_read: response.body || null,
    });
  }
}

export async function markConversationNotificationsRead(conversationId: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] conversation read request", {
      conversation_id: conversationId,
    });
  }

  const response = await readNotificationResponse(
    `/notifications/conversation/${encodeURIComponent(conversationId)}/read`,
  );

  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Notifications] conversation read failure", {
        conversation_id: conversationId,
        status: response.status,
      });
    }

    throw new Error(response.body || `Request failed with status ${response.status}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[Notifications] conversation read success", {
      conversation_id: conversationId,
      status: response.status,
    });
  }
}
