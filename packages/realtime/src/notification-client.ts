import type {
  NotificationClient,
  NotificationHistoryResponse,
  NotificationItem,
  NotificationRequestClient,
  NotificationUnreadCounts,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNotificationItem(candidate: unknown): NotificationItem | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const id = typeof candidate.id === "string" ? candidate.id : candidate.notification_id;
  if (typeof id !== "string" || !id.trim()) return null;

  const data = isRecord(candidate.data)
    ? candidate.data
    : isRecord(candidate.metadata)
      ? candidate.metadata
      : {};

  return {
    id,
    notification_type:
      typeof candidate.notification_type === "string"
        ? candidate.notification_type
        : typeof candidate.type === "string"
          ? candidate.type
          : "unknown",
    ...(typeof candidate.category === "string" ? { category: candidate.category } : {}),
    ...(isRecord(candidate.metadata) ? { metadata: candidate.metadata } : {}),
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

export function createNotificationClient(requestClient: NotificationRequestClient): NotificationClient {
  const { requestJson, requestResponse } = requestClient;

  async function getUnreadCounts(): Promise<NotificationUnreadCounts> {
    const response = await requestJson<unknown>("/notifications/unread-count");
    const counts = parseCountsResponse(response);

    if (!counts) {
      throw new Error("Invalid unread count response");
    }

    return counts;
  }

  async function getNotificationHistory(
    page = 1,
    pageSize = 20,
  ): Promise<NotificationHistoryResponse> {
    const searchParams = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    const response = await requestJson<unknown>(`/notifications/history?${searchParams.toString()}`);

    const envelope = isRecord(response) && isRecord(response.data) ? response.data : response;
    if (!isRecord(envelope) || !Array.isArray(envelope.items)) {
      throw new Error("Invalid notification history response");
    }

    const items = envelope.items
      .map(normalizeNotificationItem)
      .filter((item): item is NotificationItem => item !== null);

    const paginationRecord = isRecord(envelope.pagination)
      ? envelope.pagination
      : isRecord(response) && isRecord(response.meta) && isRecord(response.meta.pagination)
        ? response.meta.pagination
        : isRecord(response) && isRecord(response.meta)
          ? response.meta
          : {};
    const pagination = {
      total: Number(paginationRecord.total) || items.length,
      page: Number(paginationRecord.page) || page,
      page_size: Number(paginationRecord.page_size) || pageSize,
      total_pages: Number(paginationRecord.total_pages) || 0,
    };

    const result = {
      items,
      pagination,
    };

    return result;
  }

  async function readNotificationResponse(path: string, method: "PATCH" | "PUT" = "PATCH") {
    const response = await requestResponse(path, {
      method,
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

  async function markNotificationRead(notificationId: string) {
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

  async function markAllNotificationsRead() {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Notifications] read-all request");
    }

    const response = await readNotificationResponse("/notifications/read-all", "PUT");

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

  async function markConversationNotificationsRead(conversationId: string) {
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

  return {
    getUnreadCounts,
    getNotificationHistory,
    markNotificationRead,
    markAllNotificationsRead,
    markConversationNotificationsRead,
  };
}
