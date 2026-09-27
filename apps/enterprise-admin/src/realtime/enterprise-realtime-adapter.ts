import { chatRequestJson, chatRequestResponse, clearChatTokenSession, createChatSocket, getChatAccessToken } from "@ihp/chat-runtime";
import { updatePresenceStatus } from "@ihp/messaging";
import { createNotificationClient, defineRealtimeAdapter } from "@ihp/realtime";

const enterpriseNotificationClient = createNotificationClient({
  requestJson: chatRequestJson,
  requestResponse: chatRequestResponse,
});

export const enterpriseRealtimeAdapter = defineRealtimeAdapter({
  shouldConnect: () => true,
  getToken: getChatAccessToken,
  clearToken: clearChatTokenSession,
  createSocket: createChatSocket,
  updatePresenceStatus,
  notificationClient: enterpriseNotificationClient,
});
