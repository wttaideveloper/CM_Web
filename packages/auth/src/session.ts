import { resolveAuthClientConfig, resolveFrontendOrigin, type AuthClientConfig } from "./client";
import type { AuthSessionResponse, CompleteLoginResponse, LogoutResponse } from "./types";

async function parseAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Authentication request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function completeLogin(sessionCode: string, config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  const searchParams = new URLSearchParams({ sessionCode });
  const response = await fetch(`${clientConfig.completeLoginEndpoint}?${searchParams.toString()}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionCode }),
  });

  return parseAuthResponse<CompleteLoginResponse>(response);
}

export async function getSession(config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  const response = await fetch(clientConfig.sessionEndpoint, {
    method: "GET",
    credentials: "include",
  });

  return parseAuthResponse<AuthSessionResponse>(response);
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
  const logoutUrl = result.logout_url ?? result.data?.logout_url;

  if (!logoutUrl) {
    throw new Error("Logout response did not include a Keycloak logout URL.");
  }

  return logoutUrl;
}
