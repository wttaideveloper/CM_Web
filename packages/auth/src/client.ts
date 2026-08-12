export type AuthClientConfig = {
  loginEndpoint?: string;
  googleOwnerSignupEndpoint?: string;
  completeLoginEndpoint?: string;
  refreshEndpoint?: string;
  statusEndpoint?: string;
  sessionEndpoint?: string;
  logoutEndpoint?: string;
  restartLoginEndpoint?: string;
  frontendOrigin?: string | (() => string);
  callbackPath?: string;
  unauthenticatedRedirectPath?: string;
};

export type ResolvedAuthClientConfig = Required<Omit<AuthClientConfig, "frontendOrigin">> & {
  frontendOrigin?: AuthClientConfig["frontendOrigin"];
};

const DEFAULT_AUTH_CLIENT_CONFIG: ResolvedAuthClientConfig = {
  loginEndpoint: "/api/v1/auth/login",
  googleOwnerSignupEndpoint: "/api/v1/auth/signup/google",
  completeLoginEndpoint: "/api/v1/auth/complete-login",
  refreshEndpoint: "/api/v1/auth/refresh",
  statusEndpoint: "/api/v1/auth/status",
  sessionEndpoint: "/api/v1/auth/session",
  logoutEndpoint: "/api/v1/auth/logout",
  restartLoginEndpoint: "/api/v1/auth/restart-login",
  callbackPath: "/auth/validate",
  unauthenticatedRedirectPath: "/auth/login",
};

export function resolveAuthClientConfig(config?: AuthClientConfig): ResolvedAuthClientConfig {
  return {
    ...DEFAULT_AUTH_CLIENT_CONFIG,
    ...config,
  };
}

export function resolveFrontendOrigin(config?: AuthClientConfig) {
  const frontendOrigin = config?.frontendOrigin;

  if (typeof frontendOrigin === "function") {
    return frontendOrigin();
  }

  if (typeof frontendOrigin === "string" && frontendOrigin.trim()) {
    return frontendOrigin;
  }

  if (typeof window === "undefined") {
    throw new Error("A frontend origin is required when starting or ending auth outside the browser.");
  }

  return window.location.origin;
}
