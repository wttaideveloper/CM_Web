export type AuthMembership = {
  tenantRole: string;
  tenantSlug: string;
  tenantName: string;
  knowledgeRoles: string[];
  canInviteUsers: boolean;
  userRole: string;
  tenantRbacRoles: string[];
  tenantPermissions: string[];
  module?: string;
  moduleId?: string;
  moduleName?: string;
};

export type AuthUserModule = {
  id: string;
  code: string;
  name: string;
};

export type AuthImpersonation = {
  active: boolean;
  actorId?: string;
  actorEmail?: string;
  tenantSlug?: string;
  tenantName?: string;
};

export type AuthRoles = {
  tenantRole: string;
  tenantSlug: string;
  tenantName: string;
  userRole: string;
  tenantRbacRoles: string[];
  tenantPermissions: string[];
  knowledgeRoles: string[];
  canInviteUsers: boolean;
};

export type AuthUser = {
  id?: string;
  userId?: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  country?: string;
  preferredLocale?: string;
  emailVerified: boolean;
  groups: string[];
  modules?: string[];
  userModules?: AuthUserModule[];
  membership: AuthMembership | null;
  roles: AuthRoles | null;
  impersonation?: AuthImpersonation;
};

export type AuthSessionResponse = {
  message?: string;
  data?: AuthUser | null;
  authenticated?: boolean;
  hasActiveTenant?: boolean;
  needsOrganizationSetup?: boolean;
};

export type CompleteLoginResponse = AuthSessionResponse & {
  tokens?: {
    access_token: string;
    refresh_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_expires_in: number;
  };
};

export type LogoutResponse = {
  logout_url?: string;
  data?: {
    logout_url?: string;
  };
};

export type AuthContextValue = {
  user: AuthUser | null;
  userId: string | null;
  authenticated: boolean;
  isLoading: boolean;
  membership: AuthMembership | null;
  roles: AuthRoles | null;
  hasActiveTenant: boolean;
  needsOrganizationSetup: boolean;
  refreshSession: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  logout: () => Promise<string>;
};
