import { createNotificationClient } from "@ihp/realtime";

import { requestJson, requestResponse } from "@/services/api-client";

export const notificationClient = createNotificationClient({
  requestJson,
  requestResponse,
});

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
