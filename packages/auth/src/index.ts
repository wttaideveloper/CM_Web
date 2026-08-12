export { AuthProvider } from "./AuthProvider";
export { RequireAuthenticated } from "./RequireAuthenticated";
export { buildLoginUrl, checkLogin, startLogin } from "./login";
export type {
  AuthLoginCheckOptions,
  AuthLoginIdentityProvider,
  AuthLoginModule,
  AuthLoginOptions,
} from "./login";
export { buildGoogleOwnerSignupUrl, startGoogleOwnerSignup } from "./google-owner-signup";
export type { GoogleOwnerSignupOptions } from "./google-owner-signup";
export { restartLogin } from "./restart-login";
export { completeLogin, getSession, logoutWebAuth } from "./session";
export { useAuth } from "./useAuth";
export {
  getAuthMe,
  getAuthTenants,
  getInviteRoles,
  inviteUser,
  requestPasswordResetCode,
  resetPassword,
  updateAuthProfile,
  verifyPasswordResetCode,
} from "./account.service";
export type {
  AuthActionResponse,
  AuthMeResponse,
  AuthTenant,
  InviteRole,
  InviteUserPayload,
  UpdateAuthProfilePayload,
} from "./account.service";
export { getPasswordRequirements } from "./password-requirements.service";
export type { PasswordRequirementsResponse } from "./password-requirements.service";
export { default as InviteUserModal } from "./components/InviteUserModal";
export { default as PasswordResetModal } from "./components/PasswordResetModal";
export { default as ProfileEditModal } from "./components/ProfileEditModal";
export {
  buildAuthCallbackPath,
  buildShellLoginUrl,
  buildShellLoginUrlForPlatform,
  getEnterpriseAdminAppOrigin,
  getSafeEnterpriseAdminReturnUrl,
  getPlatformAdminAppOrigin,
  getSafePlatformAdminReturnUrl,
  getShellAppOrigin,
} from "./cross-app";
export type {
  AuthClientConfig,
  ResolvedAuthClientConfig,
} from "./client";
export type {
  AuthContextValue,
  AuthMembership,
  AuthRoles,
  AuthSessionResponse,
  AuthUser,
  CompleteLoginResponse,
  LogoutResponse,
} from "./types";
