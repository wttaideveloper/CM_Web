"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { usePathname } from "next/navigation";

import { createChatSocket, type ChatSocket } from "@/services/chat-socket.service";
import {
  clearMarketplaceDemoSession,
  getMarketplaceChatToken,
  getMarketplaceDemoSession,
  redirectToMarketplaceLogin,
} from "@/services/marketplace-demo-auth.service";
import {
  getNotificationHistory,
  getUnreadCounts,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  markConversationNotificationsRead as apiMarkConversationNotificationsRead,
  markNotificationRead as apiMarkNotificationRead,
  type NotificationHistoryResponse,
  type NotificationItem,
  type NotificationPagination,
  type NotificationUnreadCounts,
} from "@/services/notification.service";

type AdminSocketStatus = "connected" | "reconnecting" | "disconnected";

type AdminSocketNotification = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string | null;
  received_at: string | null;
  raw: unknown;
  source: "history" | "socket";
};

type AdminSocketContextValue = {
  socket: ChatSocket | null;
  status: AdminSocketStatus;
  notifications: AdminSocketNotification[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
  totalUnreadCount: number;
  notificationPagination: NotificationPagination | null;
  isLoadingNotifications: boolean;
  notificationError: string | null;
  refreshNotifications: () => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  markConversationNotificationsAsRead: (conversationId: string) => Promise<void>;
  latestConversationUpdate: unknown | null;
};

const AdminSocketContext = createContext<AdminSocketContextValue | null>(null);

type NotificationStateSnapshot = {
  notifications: AdminSocketNotification[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
  totalUnreadCount: number;
  notificationPagination: NotificationPagination | null;
  isLoadingNotifications: boolean;
  notificationError: string | null;
};

const DEFAULT_NOTIFICATION_STATE: NotificationStateSnapshot = {
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

function toNotificationRecord(candidate: NotificationItem | AdminSocketNotification): AdminSocketNotification {
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

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function readNotificationId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const notificationRecord =
    isRecord(payload.notification) && !Array.isArray(payload.notification)
      ? payload.notification
      : null;

  return readString(payload.id) ?? (notificationRecord ? readString(notificationRecord.id) : null);
}

function readConversationId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  return readString(payload.conversation_id) ?? readString(payload.conversationId) ?? null;
}

function readNotificationData(payload: unknown): Record<string, unknown> {
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

function readNotificationConversationId(payload: unknown): string | null {
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

function notificationSortValue(notification: AdminSocketNotification): number {
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

function sortNotifications(notifications: AdminSocketNotification[]): AdminSocketNotification[] {
  return [...notifications].sort((left, right) => notificationSortValue(right) - notificationSortValue(left));
}

function notificationCompletenessScore(notification: AdminSocketNotification): number {
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

function mergeNotificationRecords(
  current: AdminSocketNotification[],
  incomingRecords: AdminSocketNotification[],
): AdminSocketNotification[] {
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

function mergeHistoryResponse(
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

function applyCountsSnapshot(
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

function deriveTotalUnreadCount(unreadNotificationCount: number, unreadMessageCount: number) {
  return Math.max(0, unreadNotificationCount) + Math.max(0, unreadMessageCount);
}

function updateLoadedNotificationReadState(
  current: NotificationStateSnapshot,
  predicate: (notification: AdminSocketNotification) => boolean,
): NotificationStateSnapshot {
  const nextNotifications = current.notifications.map((notification) =>
    predicate(notification) ? { ...notification, is_read: true } : notification,
  );
  const unreadNotificationCount = nextNotifications.filter((item) => !item.is_read).length;

  return {
    ...current,
    notifications: nextNotifications,
    unreadNotificationCount,
    totalUnreadCount: deriveTotalUnreadCount(unreadNotificationCount, current.unreadMessageCount),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function AdminSocketProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Temporary demo/staging authentication using a shared seeded Marketplace provider account.
  // Not production multi-user authentication.
  const shouldConnect =
    Boolean(getMarketplaceDemoSession()) && pathname !== "/" && !pathname.startsWith("/auth");
  const socketRef = useRef<ChatSocket | null>(null);
  const socketTokenRef = useRef<string | null>(null);
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [status, setStatus] = useState<AdminSocketStatus>("disconnected");
  const [notificationState, setNotificationState] = useState<NotificationStateSnapshot>(
    cachedNotificationState,
  );
  const [runtimeToken, setRuntimeToken] = useState<string | null>(null);
  const [latestConversationUpdate, setLatestConversationUpdate] = useState<unknown | null>(null);
  const notificationReconcileTimerRef = useRef<number | null>(null);
  const notificationReconcileInFlightRef = useRef(false);
  const notificationReconcileQueuedRef = useRef(false);
  const conversationNotificationReadGuardsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
      return;
    }

    if (getMarketplaceDemoSession()) {
      return;
    }

    clearMarketplaceDemoSession();
    redirectToMarketplaceLogin();
  }, [pathname]);

  useEffect(() => {
    if (!shouldConnect) {
      setRuntimeToken(null);
      return;
    }

    let active = true;

    const syncRuntimeToken = async () => {
      try {
        const token = await getMarketplaceChatToken();

        if (!active) {
          return;
        }

        setRuntimeToken((current) => (current === token ? current : token));
      } catch {
        if (!active) {
          return;
        }

        clearMarketplaceDemoSession();
        redirectToMarketplaceLogin();
        setRuntimeToken(null);
      }
    };

    void syncRuntimeToken();

    const intervalId = window.setInterval(() => {
      void syncRuntimeToken();
    }, 60000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [shouldConnect]);

  useEffect(() => {
    cachedNotificationState = notificationState;
  }, [notificationState]);

  const commitNotificationState = useCallback(
    (
      updater: NotificationStateSnapshot | ((current: NotificationStateSnapshot) => NotificationStateSnapshot),
    ) => {
      setNotificationState((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        cachedNotificationState = next;
        return next;
      });
    },
    [],
  );

  const clearNotificationReconcileTimer = useCallback(() => {
    if (notificationReconcileTimerRef.current !== null) {
      window.clearTimeout(notificationReconcileTimerRef.current);
      notificationReconcileTimerRef.current = null;
    }
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    try {
      const counts = await getUnreadCounts();
      commitNotificationState((current) => applyCountsSnapshot(current, counts));
    } catch (error) {
      commitNotificationState((current) => ({
        ...current,
        notificationError: error instanceof Error ? error.message : "Failed to refresh unread counts.",
      }));
      throw error;
    }
  }, [commitNotificationState]);

  const refreshNotifications = useCallback(async () => {
    try {
      const history = await getNotificationHistory(1, 20);
      commitNotificationState((current) => mergeHistoryResponse(current, history, true));
    } catch (error) {
      commitNotificationState((current) => ({
        ...current,
        notificationError: error instanceof Error ? error.message : "Failed to refresh notifications.",
      }));
      throw error;
    }
  }, [commitNotificationState]);

  const queueNotificationReconciliation = useCallback(
    (reason: string) => {
      if (!shouldConnect) {
        return;
      }

      clearNotificationReconcileTimer();
      notificationReconcileTimerRef.current = window.setTimeout(() => {
        notificationReconcileTimerRef.current = null;

        if (notificationReconcileInFlightRef.current) {
          notificationReconcileQueuedRef.current = true;
          return;
        }

        notificationReconcileInFlightRef.current = true;

        if (process.env.NODE_ENV === "development") {
          console.log("[Notifications] reconnect reconciliation", {
            reason,
          });
        }

        void (async () => {
          try {
            const [counts, history] = await Promise.all([getUnreadCounts(), getNotificationHistory(1, 20)]);
            commitNotificationState((current) => mergeHistoryResponse(applyCountsSnapshot(current, counts), history, false));
          } catch (error) {
            commitNotificationState((current) => ({
              ...current,
              notificationError:
                error instanceof Error ? error.message : "Failed to reconcile notifications.",
            }));
          } finally {
            notificationReconcileInFlightRef.current = false;

            if (notificationReconcileQueuedRef.current) {
              notificationReconcileQueuedRef.current = false;
              queueNotificationReconciliation("queued");
            }
          }
        })();
      }, 250);
    },
    [clearNotificationReconcileTimer, commitNotificationState, shouldConnect],
  );

  const handleNotification = useCallback(
    (payload: unknown) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] receive notification", payload);
      }

      const notificationId = readNotificationId(payload);
      if (!notificationId) {
        queueNotificationReconciliation("notification without id");
        return;
      }

      const notificationRecord =
        isRecord(payload) && isRecord(payload.notification) && !Array.isArray(payload.notification)
          ? payload.notification
          : null;
      const notificationType =
        isRecord(payload) && typeof payload.type === "string"
          ? payload.type
          : isRecord(payload) && typeof payload.notification_type === "string"
            ? payload.notification_type
            : notificationRecord && typeof notificationRecord.notification_type === "string"
              ? notificationRecord.notification_type
              : "unknown";
      const title =
        isRecord(payload) && typeof payload.title === "string"
          ? payload.title
          : notificationRecord && typeof notificationRecord.title === "string"
            ? notificationRecord.title
            : "";
      const body =
        isRecord(payload) && typeof payload.body === "string"
          ? payload.body
          : notificationRecord && typeof notificationRecord.body === "string"
            ? notificationRecord.body
            : "";
      const createdAt =
        isRecord(payload) && typeof payload.created_at === "string"
          ? payload.created_at
          : notificationRecord && typeof notificationRecord.created_at === "string"
            ? notificationRecord.created_at
            : null;
      const receivedAt = new Date().toISOString();
      const data = readNotificationData(payload);
      const incoming: AdminSocketNotification = {
        id: notificationId,
        notification_type: notificationType,
        title,
        body,
        data,
        is_read:
          isRecord(payload) && typeof payload.is_read === "boolean" ? payload.is_read : false,
        created_at: createdAt,
        received_at: receivedAt,
        raw: payload,
        source: "socket",
      };

      const conversationId = readNotificationConversationId(payload);
      if (conversationId) {
        conversationNotificationReadGuardsRef.current.delete(conversationId);
      }

      commitNotificationState((current) => ({
        ...current,
        notifications: mergeNotificationRecords(current.notifications, [incoming]),
      }));
      queueNotificationReconciliation("socket notification");
    },
    [commitNotificationState, queueNotificationReconciliation],
  );

  const handleConversationUpdated = useCallback(
    (payload: unknown) => {
      setLatestConversationUpdate(payload);
      queueNotificationReconciliation("conversation_updated");
    },
    [queueNotificationReconciliation],
  );

  const loadMoreNotifications = useCallback(async () => {
    const currentPagination = notificationState.notificationPagination;

    if (
      notificationState.isLoadingNotifications ||
      !currentPagination ||
      currentPagination.page >= currentPagination.total_pages
    ) {
      return;
    }

    const nextPage = currentPagination.page + 1;

    try {
      commitNotificationState((current) => ({
        ...current,
        isLoadingNotifications: true,
        notificationError: null,
      }));

      const history = await getNotificationHistory(nextPage, currentPagination.page_size);
      commitNotificationState((current) => ({
        ...mergeHistoryResponse(current, history, false),
        isLoadingNotifications: false,
      }));
    } catch (error) {
      commitNotificationState((current) => ({
        ...current,
        isLoadingNotifications: false,
        notificationError: error instanceof Error ? error.message : "Failed to load more notifications.",
      }));
    }
  }, [commitNotificationState, notificationState.isLoadingNotifications, notificationState.notificationPagination]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const response = await apiMarkNotificationRead(notificationId);
        const responseRecord = isRecord(response) ? response : null;
        const nextItem: AdminSocketNotification = {
          id: notificationId,
          notification_type:
            responseRecord && typeof responseRecord.notification_type === "string"
              ? responseRecord.notification_type
              : "unknown",
          title: responseRecord && typeof responseRecord.title === "string" ? responseRecord.title : "",
          body: responseRecord && typeof responseRecord.body === "string" ? responseRecord.body : "",
          data: responseRecord && isRecord(responseRecord.data) ? readRecord(responseRecord.data) : {},
          is_read: true,
          created_at:
            responseRecord && typeof responseRecord.created_at === "string"
              ? responseRecord.created_at
              : null,
          received_at: new Date().toISOString(),
          raw: response ?? null,
          source: "socket",
        };

        commitNotificationState((current) => {
          const nextNotifications = current.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, is_read: true } : notification,
          );
          const unreadNotificationCount = nextNotifications.filter((item) => !item.is_read).length;
          return {
            ...current,
            notifications: mergeNotificationRecords(nextNotifications, [nextItem]),
            unreadNotificationCount,
            totalUnreadCount: deriveTotalUnreadCount(unreadNotificationCount, current.unreadMessageCount),
            notificationError: null,
          };
        });
      } catch (error) {
        commitNotificationState((current) => ({
          ...current,
          notificationError: error instanceof Error ? error.message : "Failed to mark notification read.",
        }));
        throw error;
      }
    },
    [commitNotificationState],
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await apiMarkAllNotificationsRead();
      commitNotificationState((current) => {
        const nextNotifications = current.notifications.map((notification) => ({
          ...notification,
          is_read: true,
        }));

        return {
          ...current,
          notifications: nextNotifications,
          unreadNotificationCount: 0,
          totalUnreadCount: current.unreadMessageCount,
          notificationError: null,
        };
      });
    } catch (error) {
      commitNotificationState((current) => ({
        ...current,
        notificationError: error instanceof Error ? error.message : "Failed to mark all notifications read.",
      }));
      throw error;
    }
  }, [commitNotificationState]);

  const markConversationNotificationsAsRead = useCallback(
    async (conversationId: string) => {
      if (conversationNotificationReadGuardsRef.current.has(conversationId)) {
        return;
      }

      try {
        await apiMarkConversationNotificationsRead(conversationId);
        conversationNotificationReadGuardsRef.current.add(conversationId);
        commitNotificationState((current) => {
          const nextNotifications = current.notifications.map((notification) =>
            readConversationId(notification.data) === conversationId
              ? { ...notification, is_read: true }
              : notification,
          );
          const unreadNotificationCount = nextNotifications.filter((item) => !item.is_read).length;

          return {
            ...current,
            notifications: nextNotifications,
            unreadNotificationCount,
            totalUnreadCount: deriveTotalUnreadCount(unreadNotificationCount, current.unreadMessageCount),
            notificationError: null,
          };
        });
        await refreshUnreadCounts();
      } catch (error) {
        commitNotificationState((current) => ({
          ...current,
          notificationError:
            error instanceof Error ? error.message : "Failed to clear conversation notifications.",
        }));
        throw error;
      }
    },
    [commitNotificationState, refreshUnreadCounts],
  );

  useEffect(() => {
    if (!shouldConnect) {
      return;
    }

    let active = true;

    if (notificationsHydrated) {
      setNotificationState(cachedNotificationState);
      return () => {
        active = false;
      };
    }

    if (initialNotificationsPromise) {
      void initialNotificationsPromise.then(() => {
        if (active) {
          setNotificationState(cachedNotificationState);
        }
      });

      return () => {
        active = false;
      };
    }

    cachedNotificationState = {
      ...cachedNotificationState,
      isLoadingNotifications: true,
      notificationError: null,
    };
    setNotificationState(cachedNotificationState);

    initialNotificationsPromise = (async () => {
      try {
        const [counts, history] = await Promise.all([getUnreadCounts(), getNotificationHistory(1, 20)]);
        cachedNotificationState = mergeHistoryResponse(
          applyCountsSnapshot(
            {
              ...cachedNotificationState,
              isLoadingNotifications: true,
              notificationError: null,
            },
            counts,
          ),
          history,
          true,
        );
        cachedNotificationState = {
          ...cachedNotificationState,
          isLoadingNotifications: false,
        };
      } catch (error) {
        cachedNotificationState = {
          ...cachedNotificationState,
          isLoadingNotifications: false,
          notificationError:
            error instanceof Error ? error.message : "Failed to load notifications.",
        };
      } finally {
        notificationsHydrated = true;
        initialNotificationsPromise = null;
      }
    })();

    void initialNotificationsPromise.then(() => {
      if (active) {
        setNotificationState(cachedNotificationState);
      }
    });

    return () => {
      active = false;
    };
  }, [shouldConnect]);

  useEffect(() => {
    if (!shouldConnect || !runtimeToken) {
      const existingSocket = socketRef.current;

      if (existingSocket) {
        existingSocket.removeAllListeners();
        existingSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
      }

      socketTokenRef.current = null;
      setStatus("disconnected");
      return;
    }

    let active = true;
    const existingSocket = socketRef.current;
    const shouldRecreateSocket = !existingSocket || socketTokenRef.current !== runtimeToken;
    let nextSocket = existingSocket;

    if (shouldRecreateSocket) {
      if (existingSocket) {
        existingSocket.removeAllListeners();
        existingSocket.disconnect();
      }

      nextSocket = createChatSocket(runtimeToken);
      socketRef.current = nextSocket;
      socketTokenRef.current = runtimeToken;
      setSocket(nextSocket);
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] instance created", {
          connected: nextSocket.connected,
          socketId: nextSocket.id,
        });
      }
    } else if (nextSocket) {
      nextSocket.auth = {
        token: runtimeToken,
      };
    }

    if (!nextSocket) {
      return () => {
        active = false;
      };
    }

    const handleConnect = () => {
      if (!active) {
        return;
      }

      setStatus("connected");
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] connected", {
          socketId: nextSocket?.id,
          connected: nextSocket?.connected,
          transport: nextSocket?.io.engine?.transport?.name,
        });
      }
    };

    const handleDisconnect = (reason: string) => {
      if (!active) {
        return;
      }

      setStatus("disconnected");
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] disconnected", {
          reason,
          socketId: nextSocket?.id,
          connected: nextSocket?.connected,
        });
      }
    };

    const handleConnectError = (error: Error) => {
      if (!active) {
        return;
      }

      setStatus("reconnecting");
      if (process.env.NODE_ENV === "development") {
        console.warn("[Admin socket] connect_error", {
          message: error.message,
          connected: nextSocket?.connected,
        });
      }
    };

    const handleReconnectAttempt = (attempt: number) => {
      if (!active) {
        return;
      }

      setStatus("reconnecting");
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] reconnect_attempt", {
          attempt,
          socketId: nextSocket?.id,
          connected: nextSocket?.connected,
        });
      }
    };

    const handleReconnect = (attempt: number) => {
      if (!active) {
        return;
      }

      setStatus("connected");
      queueNotificationReconciliation("reconnect");
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] reconnect", {
          attempt,
          socketId: nextSocket?.id,
          connected: nextSocket?.connected,
        });
      }
    };

    const handleReconnectError = (error: Error) => {
      if (!active) {
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] reconnect_error", {
          message: error.message,
          socketId: nextSocket?.id,
          connected: nextSocket?.connected,
        });
      }
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.on("connect_error", handleConnectError);
    nextSocket.io.on("reconnect_attempt", handleReconnectAttempt);
    nextSocket.io.on("reconnect", handleReconnect);
    nextSocket.io.on("reconnect_error", handleReconnectError);
    nextSocket.on("notification", handleNotification);
    nextSocket.on("conversation_updated", handleConversationUpdated);
    nextSocket.connect();

    return () => {
      active = false;

      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] provider cleanup", {
          connected: nextSocket.connected,
          socketId: nextSocket.id,
        });
      }

      nextSocket.disconnect();
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin socket] disconnect completed", {
          connected: nextSocket.connected,
          socketId: nextSocket.id,
        });
      }
      nextSocket.off("connect", handleConnect);
      nextSocket.off("disconnect", handleDisconnect);
      nextSocket.off("connect_error", handleConnectError);
      nextSocket.io.off("reconnect_attempt", handleReconnectAttempt);
      nextSocket.io.off("reconnect", handleReconnect);
      nextSocket.io.off("reconnect_error", handleReconnectError);
      nextSocket.off("notification", handleNotification);
      nextSocket.off("conversation_updated", handleConversationUpdated);
      socketRef.current = null;
      socketTokenRef.current = null;
    };
  }, [handleConversationUpdated, handleNotification, queueNotificationReconciliation, runtimeToken, shouldConnect]);

  const value = useMemo<AdminSocketContextValue>(
    () => ({
      socket,
      status,
      notifications: notificationState.notifications,
      unreadNotificationCount: notificationState.unreadNotificationCount,
      unreadMessageCount: notificationState.unreadMessageCount,
      totalUnreadCount: notificationState.totalUnreadCount,
      notificationPagination: notificationState.notificationPagination,
      isLoadingNotifications: notificationState.isLoadingNotifications,
      notificationError: notificationState.notificationError,
      refreshNotifications,
      refreshUnreadCounts,
      loadMoreNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      markConversationNotificationsAsRead,
      latestConversationUpdate,
    }),
    [
      latestConversationUpdate,
      loadMoreNotifications,
      markAllNotificationsAsRead,
      markConversationNotificationsAsRead,
      markNotificationAsRead,
      notificationState,
      refreshNotifications,
      refreshUnreadCounts,
      socket,
      status,
    ],
  );

  return <AdminSocketContext.Provider value={value}>{children}</AdminSocketContext.Provider>;
}

export function useAdminSocket() {
  const context = useContext(AdminSocketContext);

  if (!context) {
    throw new Error("useAdminSocket must be used within AdminSocketProvider");
  }

  return context;
}
