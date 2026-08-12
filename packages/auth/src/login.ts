import { resolveAuthClientConfig, resolveFrontendOrigin, type AuthClientConfig } from "./client";
import type { AuthSessionResponse } from "./types";

/** The Web Auth modules accepted by the login endpoint. */
export type AuthLoginModule = "knowledge" | "enterprise";

/** The social identity providers accepted by the login endpoint. */
export type AuthLoginIdentityProvider = "google" | "facebook";

/**
 * Configures an interactive Web Auth login request.
 *
 * `callbackPath` and `frontendOrigin` remain available through `AuthClientConfig`
 * for backwards compatibility. `returnTo` takes precedence over `callbackPath`.
 */
export type AuthLoginOptions = AuthClientConfig & {
  returnTo?: string;
  module?: AuthLoginModule;
  rememberMe?: boolean;
  fresh?: boolean;
  browserRedirect?: boolean;
  identityProvider?: AuthLoginIdentityProvider;
  kcIdpHint?: AuthLoginIdentityProvider;
  ownerSignup?: boolean;
  error?: string;
};

/** Configures a non-navigating login status check request. */
export type AuthLoginCheckOptions = AuthLoginOptions;

function setOptionalBoolean(params: URLSearchParams, name: string, value: boolean | undefined) {
  if (value !== undefined) {
    params.set(name, String(value));
  }
}

function createLoginParams(options?: AuthLoginOptions, check?: boolean) {
  const clientConfig = resolveAuthClientConfig(options);
  const identityProvider = options?.kcIdpHint ?? options?.identityProvider;
  const params = new URLSearchParams({
    module: options?.module ?? "enterprise",
    frontend_origin: resolveFrontendOrigin(options),
    return_to: options?.returnTo ?? clientConfig.callbackPath,
    rememberMe: String(options?.rememberMe ?? false),
  });

  setOptionalBoolean(params, "check", check);
  setOptionalBoolean(params, "browser_redirect", options?.browserRedirect);
  setOptionalBoolean(params, "fresh", options?.fresh);
  setOptionalBoolean(params, "owner_signup", options?.ownerSignup);

  if (identityProvider) {
    params.set("kc_idp_hint", identityProvider);
  }

  if (options?.error !== undefined) {
    params.set("error", options.error);
  }

  return { clientConfig, params };
}

/** Builds a Web Auth login URL without causing browser navigation. */
export function buildLoginUrl(options?: AuthLoginOptions) {
  const { clientConfig, params } = createLoginParams(options);
  return `${clientConfig.loginEndpoint}?${params.toString()}`;
}

function getDebugLoginUrl(url: string, hasError: boolean) {
  if (!hasError) {
    return url;
  }

  const debugUrl = new URL(url, window.location.origin);
  debugUrl.searchParams.set("error", "[REDACTED]");
  return debugUrl.pathname + debugUrl.search;
}

/** Starts an interactive Web Auth login by navigating the browser to the login endpoint. */
export function startLogin(options?: AuthLoginOptions) {
  const { clientConfig, params } = createLoginParams(options);
  const url = `${clientConfig.loginEndpoint}?${params.toString()}`;

  if (process.env.NODE_ENV === "development") {
    console.log("[AUTH DEBUG] Login initiated");
    console.log("[AUTH DEBUG] Browser origin:", window.location.origin);
    console.log("[AUTH DEBUG] Login endpoint:", clientConfig.loginEndpoint);
    console.log("[AUTH DEBUG] module:", params.get("module"));
    console.log("[AUTH DEBUG] frontend_origin:", params.get("frontend_origin"));
    console.log("[AUTH DEBUG] return_to:", params.get("return_to"));
    console.log("[AUTH DEBUG] rememberMe:", params.get("rememberMe"));
    console.log("[AUTH DEBUG] Browser request URL:", getDebugLoginUrl(url, options?.error !== undefined));
  }

  window.location.assign(url);
}

/**
 * Checks the Web Auth login state without starting an OIDC browser navigation.
 *
 * The endpoint returns JSON for `check=true`, so this request intentionally uses
 * `fetch` with cookie credentials rather than `window.location.assign`.
 */
export async function checkLogin(options?: AuthLoginCheckOptions): Promise<AuthSessionResponse> {
  const { clientConfig, params } = createLoginParams(options, true);
  const url = `${clientConfig.loginEndpoint}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Login check failed with status ${response.status}`);
  }

  return (await response.json()) as AuthSessionResponse;
}
