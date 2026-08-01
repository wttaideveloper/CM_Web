import type { ChatSocket } from "@ihp/chat-runtime";

export type RealtimeStatus = "connected" | "reconnecting" | "disconnected";

export type NotificationItem = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type NotificationUnreadCounts = {
  unread_messages: number;
  unread_notifications: number;
  total_unread: number;
};

export type NotificationPagination = {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type NotificationHistoryResponse = {
  items: NotificationItem[];
  pagination: NotificationPagination;
};

export type RealtimeNotification = {
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

export type NotificationStateSnapshot = {
  notifications: RealtimeNotification[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
  totalUnreadCount: number;
  notificationPagination: NotificationPagination | null;
  isLoadingNotifications: boolean;
  notificationError: string | null;
};

export type NotificationRequestClient = {
  requestJson: <T>(path: string, init?: RequestInit) => Promise<T>;
  requestResponse: (
    path: string,
    init?: RequestInit,
    includeJsonContentType?: boolean,
  ) => Promise<Response>;
};

export type NotificationClient = {
  getUnreadCounts: () => Promise<NotificationUnreadCounts>;
  getNotificationHistory: (page?: number, pageSize?: number) => Promise<NotificationHistoryResponse>;
  markNotificationRead: (notificationId: string) => Promise<unknown>;
  markAllNotificationsRead: () => Promise<void>;
  markConversationNotificationsRead: (conversationId: string) => Promise<void>;
};

export type RealtimeRuntimeAdapter = {
  shouldConnect: (pathname: string) => boolean;
  getToken: () => Promise<string>;
  clearToken: () => void;
  createSocket: (token?: string) => ChatSocket;
  updatePresenceStatus: (status: "online" | "offline" | "away") => Promise<unknown>;
  notificationClient: NotificationClient;
};

export type RealtimeContextValue = {
  socket: ChatSocket | null;
  status: RealtimeStatus;
  setActiveConversationId: (conversationId: string | null) => void;
  notifications: RealtimeNotification[];
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
