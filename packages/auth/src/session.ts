import { resolveAuthClientConfig, resolveFrontendOrigin, type AuthClientConfig } from "./client";
import type {
  AuthSessionResponse,
  AuthStatusResponse,
  RefreshAuthSessionResponse,
  CompleteLoginResponse,
  LogoutResponse,
} from "./types";

function logAuthDebug(message: string, details: Record<string, string | number | boolean | undefined>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[AUTH DEBUG] ${message}`, details);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function logSessionStructure(result: AuthSessionResponse) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const body = isRecord(result) ? result : null;
  const dataCandidate: unknown = body?.data;
  const data = isRecord(dataCandidate) ? dataCandidate : null;
  const topLevelAuthenticated = typeof body?.authenticated === "boolean" ? body.authenticated : undefined;
  const dataAuthenticated = typeof data?.authenticated === "boolean" ? data.authenticated : undefined;

  console.log("[AUTH DEBUG] session body top-level keys:", body ? Object.keys(body) : []);
  console.log("[AUTH DEBUG] session data keys:", data ? Object.keys(data) : []);
  console.log("[AUTH DEBUG] authenticated at top level:", topLevelAuthenticated);
  console.log("[AUTH DEBUG] authenticated inside data:", dataAuthenticated);
}

async function parseAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Authentication request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function getLogoutUrl(result: LogoutResponse) {
  const logoutUrl = result.logout_url ?? result.data?.logout_url;

  if (!logoutUrl) {
    throw new Error("Logout response did not include a Keycloak logout URL.");
  }

  return logoutUrl;
}

export type GetWebAuthLogoutOptions = {
  config?: AuthClientConfig;
  local?: boolean;
  json?: boolean;
};

export async function completeLogin(sessionCode: string, config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  const searchParams = new URLSearchParams({ sessionCode });
  logAuthDebug("complete-login request", {
    method: "POST",
    endpoint: clientConfig.completeLoginEndpoint,
    credentials: "include",
  });
  const response = await fetch(`${clientConfig.completeLoginEndpoint}?${searchParams.toString()}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionCode }),
  });

  logAuthDebug("complete-login response", { status: response.status });
  const result = await parseAuthResponse<CompleteLoginResponse>(response);
  logAuthDebug("complete-login authenticated", { authenticated: result.authenticated });
  return result;
}

export async function getSession(config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  logAuthDebug("session request", {
    method: "GET",
    endpoint: clientConfig.sessionEndpoint,
    credentials: "include",
  });
  const response = await fetch(clientConfig.sessionEndpoint, {
    method: "GET",
    credentials: "include",
  });

  logAuthDebug("session response", { status: response.status });
  const result = await parseAuthResponse<AuthSessionResponse>(response);
  logSessionStructure(result);
  logAuthDebug("session authenticated", { authenticated: result.authenticated });
  return result;
}

/** Retrieves the lightweight cookie-backed Web Auth status for route guards. */
export async function getAuthStatus(
  config?: AuthClientConfig,
): Promise<AuthStatusResponse> {
  const clientConfig = resolveAuthClientConfig(config);
  const response = await fetch(clientConfig.statusEndpoint, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseAuthResponse<AuthStatusResponse>(response);
}

/** Refreshes the browser's Web Auth session using its HttpOnly refresh cookie. */
export async function refreshAuthSession(
  config?: AuthClientConfig,
): Promise<RefreshAuthSessionResponse> {
  const clientConfig = resolveAuthClientConfig(config);
  const response = await fetch(clientConfig.refreshEndpoint, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return parseAuthResponse<RefreshAuthSessionResponse>(response);
}

export async function logoutWebAuth(config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  const params = new URLSearchParams({
    frontend_origin: resolveFrontendOrigin(config),
  });
  const response = await fetch(`${clientConfig.logoutEndpoint}?${params.toString()}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Logout failed with status ${response.status}`);
  }

  const result = await response.json() as LogoutResponse;
  return getLogoutUrl(result);
}

/** Starts GET Web Auth logout in browser or SPA JSON mode, then navigates to Keycloak logout. */
export async function startWebAuthGetLogout(
  options?: GetWebAuthLogoutOptions,
): Promise<void> {
  const clientConfig = resolveAuthClientConfig(options?.config);
  const params = new URLSearchParams({
    frontend_origin: resolveFrontendOrigin(options?.config),
  });

  if (options?.local) {
    params.set("local", "1");
  }

  if (!options?.json) {
    window.location.assign(`${clientConfig.logoutEndpoint}?${params.toString()}`);
    return;
  }

  params.set("json", "1");
  const response = await fetch(`${clientConfig.logoutEndpoint}?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const result = await parseAuthResponse<LogoutResponse>(response);

  window.location.assign(getLogoutUrl(result));
}
