import { chatRequestJson, chatRequestResponse, clearChatTokenSession, createChatSocket, getChatToken } from "@ihp/chat-runtime";
import { updatePresenceStatus } from "@ihp/messaging";
import { createNotificationClient, defineRealtimeAdapter } from "@ihp/realtime";

const enterpriseNotificationClient = createNotificationClient({
  requestJson: chatRequestJson,
  requestResponse: chatRequestResponse,
});

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
