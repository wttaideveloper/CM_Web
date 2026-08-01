import {
  chatRequestJson,
  chatRequestResponse,
  clearChatTokenSession,
  createChatSocket,
  getChatAccessToken,
} from "@ihp/chat-runtime";
import { updatePresenceStatus } from "@ihp/messaging";
import { createNotificationClient, defineRealtimeAdapter } from "@ihp/realtime";

const enterpriseNotificationClient = createNotificationClient({
  requestJson: chatRequestJson,
  requestResponse: chatRequestResponse,
});

export const enterpriseRealtimeAdapter = defineRealtimeAdapter({
  // The final Web Auth chat-session endpoint is not yet available to Enterprise Admin.
  // Keep the provider mounted for route composition, but avoid invalid socket and REST retries.
  shouldConnect: () => false,
  getToken: getChatAccessToken,
  clearToken: clearChatTokenSession,
  createSocket: createChatSocket,
  updatePresenceStatus,
  notificationClient: enterpriseNotificationClient,
});
