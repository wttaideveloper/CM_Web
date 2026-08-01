import type {
  NotificationHistoryResponse,
  NotificationItem,
  NotificationStateSnapshot,
  NotificationUnreadCounts,
  RealtimeNotification,
} from "./types";

export const DEFAULT_NOTIFICATION_STATE: NotificationStateSnapshot = {
  notifications: [],
  unreadNotificationCount: 0,
  unreadMessageCount: 0,
  totalUnreadCount: 0,
  notificationPagination: null,
  isLoadingNotifications: false,
  notificationError: null,
};

let cachedNotificationState: NotificationStateSnapshot = DEFAULT_NOTIFICATION_STATE;
let initialNotificationsPromise: Promise<void> | null = null;
let notificationsHydrated = false;

export function getCachedNotificationState() {
  return cachedNotificationState;
}

export function setCachedNotificationState(nextState: NotificationStateSnapshot) {
  cachedNotificationState = nextState;
}

export function getInitialNotificationsPromise() {
  return initialNotificationsPromise;
}

export function setInitialNotificationsPromise(nextPromise: Promise<void> | null) {
  initialNotificationsPromise = nextPromise;
}

export function getNotificationsHydrated() {
  return notificationsHydrated;
}

export function setNotificationsHydrated(nextValue: boolean) {
  notificationsHydrated = nextValue;
}

export function toNotificationRecord(candidate: NotificationItem | RealtimeNotification): RealtimeNotification {
  return {
    id: candidate.id,
    notification_type: candidate.notification_type,
    title: candidate.title,
    body: candidate.body,
    data: candidate.data,
    is_read: candidate.is_read,
    created_at: candidate.created_at ?? null,
    received_at: "received_at" in candidate ? candidate.received_at : null,
    raw: "raw" in candidate ? candidate.raw : candidate,
    source: "source" in candidate ? candidate.source : "history",
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readConversationId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  return readString(payload.conversation_id) ?? readString(payload.conversationId) ?? null;
}

export function readNotificationId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const notificationRecord =
    isRecord(payload.notification) && !Array.isArray(payload.notification)
      ? payload.notification
      : null;

  return readString(payload.id) ?? (notificationRecord ? readString(notificationRecord.id) : null);
}

export function readNotificationData(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    return {};
  }

  if (isRecord(payload.data)) {
    return readRecord(payload.data);
  }

  if (isRecord(payload.notification) && isRecord(payload.notification.data)) {
    return readRecord(payload.notification.data);
  }

  return {};
}

export function readNotificationConversationId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const data = readNotificationData(payload);
  const notificationRecord =
    isRecord(payload.notification) && !Array.isArray(payload.notification)
      ? payload.notification
      : null;
  const notificationData =
    notificationRecord && isRecord(notificationRecord.data)
      ? (notificationRecord.data as Record<string, unknown>)
      : {};

  return (
    readString(data.conversation_id) ??
    readString(data.conversationId) ??
    readString(notificationData.conversation_id) ??
    readString(notificationData.conversationId) ??
    readString(notificationRecord?.conversation_id) ??
    readString(notificationRecord?.conversationId) ??
    readString(payload.conversation_id) ??
    readString(payload.conversationId) ??
    null
  );
}

function notificationSortValue(notification: RealtimeNotification): number {
  const createdAtValue = notification.created_at ? Date.parse(notification.created_at) : Number.NaN;
  if (!Number.isNaN(createdAtValue)) {
    return createdAtValue;
  }

  const receivedAtValue = notification.received_at ? Date.parse(notification.received_at) : Number.NaN;
  if (!Number.isNaN(receivedAtValue)) {
    return receivedAtValue;
  }

  return 0;
}

function sortNotifications(notifications: RealtimeNotification[]): RealtimeNotification[] {
  return [...notifications].sort((left, right) => notificationSortValue(right) - notificationSortValue(left));
}

function notificationCompletenessScore(notification: RealtimeNotification): number {
  let score = 0;

  if (notification.title.trim().length > 0) score += 1;
  if (notification.body.trim().length > 0) score += 1;
  if (notification.notification_type.trim().length > 0) score += 1;
  if (Object.keys(notification.data).length > 0) score += 1;
  if (notification.created_at) score += 1;
  if (notification.received_at) score += 1;
  if (notification.raw && typeof notification.raw === "object") score += 1;

  return score;
}

export function mergeNotificationRecords(
  current: RealtimeNotification[],
  incomingRecords: RealtimeNotification[],
): RealtimeNotification[] {
  const next = [...current];

  incomingRecords.forEach((incoming) => {
    const existingIndex = next.findIndex((item) => item.id === incoming.id);

    if (existingIndex === -1) {
      next.unshift(incoming);
      return;
    }

    const existing = next[existingIndex];
    const shouldReplace =
      notificationCompletenessScore(incoming) > notificationCompletenessScore(existing) ||
      notificationSortValue(incoming) > notificationSortValue(existing);

    if (!shouldReplace) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Notifications] duplicate ignored", incoming.id);
      }
      return;
    }

    next[existingIndex] = {
      ...existing,
      ...incoming,
      data: {
        ...existing.data,
        ...incoming.data,
      },
      raw: incoming.raw ?? existing.raw,
      source: incoming.source,
    };
  });

  return sortNotifications(next);
}

export function mergeHistoryResponse(
  current: NotificationStateSnapshot,
  historyResponse: NotificationHistoryResponse,
  replaceExisting = false,
): NotificationStateSnapshot {
  const incoming = historyResponse.items.map((item) => toNotificationRecord(item));
  const nextNotifications = replaceExisting
    ? mergeNotificationRecords([], incoming)
    : mergeNotificationRecords(current.notifications, incoming);

  return {
    ...current,
    notifications: nextNotifications,
    notificationPagination: historyResponse.pagination,
    notificationError: null,
  };
}

export function applyCountsSnapshot(
  current: NotificationStateSnapshot,
  counts: NotificationUnreadCounts,
): NotificationStateSnapshot {
  return {
    ...current,
    unreadNotificationCount: Math.max(0, counts.unread_notifications),
    unreadMessageCount: Math.max(0, counts.unread_messages),
    totalUnreadCount: Math.max(0, counts.total_unread),
    notificationError: null,
  };
}

export function deriveTotalUnreadCount(unreadNotificationCount: number, unreadMessageCount: number) {
  return Math.max(0, unreadNotificationCount) + Math.max(0, unreadMessageCount);
}
