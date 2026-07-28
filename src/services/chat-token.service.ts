import { getChatToken } from "@/services/auth.service";
import {
  getMarketplaceChatToken,
  getMarketplaceDemoSession,
} from "@/services/marketplace-demo-auth.service";

type ChatTokenSession = {
  accessToken: string;
  expiresAt: number;
  userId: string;
  tenantId: string;
};

let chatTokenSession: ChatTokenSession | null = null;
let chatTokenRequest: Promise<ChatTokenSession> | null = null;
let chatSessionEnabled = false;
const useDemoChatToken = process.env.NEXT_PUBLIC_USE_DEMO_CHAT_TOKEN === "true";

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
  if (useDemoChatToken) {
    return getMarketplaceDemoSession()?.user.id ?? null;
  }

  return chatTokenSession?.userId ?? null;
}

function isTokenUsable(session: ChatTokenSession) {
  return session.expiresAt - Date.now() > 30_000;
}

async function getDemoChatTokenSession(): Promise<ChatTokenSession> {
  const accessToken = await getMarketplaceChatToken();
  const demoSession = getMarketplaceDemoSession();

  if (!demoSession) {
    throw new Error("Marketplace demo session is missing or expired.");
  }

  return {
    accessToken,
    expiresAt: demoSession.expiresAt,
    userId: demoSession.user.id,
    tenantId: "",
  };
}

export async function getChatAccessToken() {
  if (!chatSessionEnabled) {
    throw new Error("Chat is available only for internal users assigned as service providers.");
  }

  if (chatTokenSession && isTokenUsable(chatTokenSession)) {
    return chatTokenSession.accessToken;
  }

  if (!chatTokenRequest) {
    chatTokenRequest = (useDemoChatToken
      ? getDemoChatTokenSession()
      : getChatToken().then((response) => ({
          accessToken: response.access_token,
          expiresAt: Date.now() + response.expires_in * 1000,
          userId: response.user_id,
          tenantId: response.tenant_id,
        })))
      .then((session) => {
        chatTokenSession = session;
        return session;
      })
      .finally(() => {
        chatTokenRequest = null;
      });
  }

  return (await chatTokenRequest).accessToken;
}
