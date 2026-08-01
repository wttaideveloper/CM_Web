import { CHAT_API_BASE_URL } from "@/lib/chat-api";

export {
  completeLogin,
  getSession,
  logoutWebAuth,
  startLogin,
} from "@ihp/auth";
export type {
  AuthMembership,
  AuthRoles,
  AuthSessionResponse,
  AuthUser,
  CompleteLoginResponse,
  LogoutResponse,
} from "@ihp/auth";
export {
  getAuthMe,
  getAuthTenants,
  getInviteRoles,
  inviteUser,
  requestPasswordResetCode,
  resetPassword,
  updateAuthProfile,
  verifyPasswordResetCode,
} from "@ihp/auth";
export type {
  AuthActionResponse,
  AuthMeResponse,
  AuthTenant,
  InviteRole,
  InviteUserPayload,
  UpdateAuthProfilePayload,
} from "@ihp/auth";

export type ChatTokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  scope: "chat";
  user_id: string;
  tenant_id: string;
};

async function parseAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Authentication request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getChatToken() {
  const response = await fetch(`${CHAT_API_BASE_URL}/auth/chat-token`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  return parseAuthResponse<ChatTokenResponse>(response);
}
