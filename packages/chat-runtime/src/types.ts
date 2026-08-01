export type ChatTokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  scope: "chat";
  user_id: string;
  tenant_id: string;
};

export type ChatTokenSession = {
  accessToken: string;
  expiresAt: number;
  userId: string;
  tenantId: string;
};

export type ChatAuthContextValue = {
  canUseProviderChat: boolean;
  isReady: boolean;
};
