import { getChatToken } from "@/services/auth.service";

type ChatTokenSession = {
  accessToken: string;
  expiresAt: number;
  userId: string;
  tenantId: string;
};

let chatTokenSession: ChatTokenSession | null = null;
let chatTokenRequest: Promise<ChatTokenSession> | null = null;
let chatSessionEnabled = false;

export function setChatSessionEnabled(enabled: boolean) {
  chatSessionEnabled = enabled;

  if (!enabled) {
    chatTokenSession = null;
  }
}

export function clearChatTokenSession() {
  chatTokenSession = null;
  chatTokenRequest = null;
}

export function getChatTokenUserId() {
  return chatTokenSession?.userId ?? null;
}

function isTokenUsable(session: ChatTokenSession) {
  return session.expiresAt - Date.now() > 30_000;
}

export async function getChatAccessToken() {
  if (!chatSessionEnabled) {
    throw new Error("Chat is available only for internal users assigned as service providers.");
  }

  if (chatTokenSession && isTokenUsable(chatTokenSession)) {
    return chatTokenSession.accessToken;
  }

  if (!chatTokenRequest) {
    chatTokenRequest = getChatToken()
      .then((response) => {
        const session = {
          accessToken: response.access_token,
          expiresAt: Date.now() + response.expires_in * 1000,
          userId: response.user_id,
          tenantId: response.tenant_id,
        };
        chatTokenSession = session;
        return session;
      })
      .finally(() => {
        chatTokenRequest = null;
      });
  }

  return (await chatTokenRequest).accessToken;
}
