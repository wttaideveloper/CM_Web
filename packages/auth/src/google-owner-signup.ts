import { resolveAuthClientConfig, resolveFrontendOrigin, type AuthClientConfig } from "./client";
import type { AuthLoginModule } from "./login";

/** Configures a Google organization-owner signup request. */
export type GoogleOwnerSignupOptions = AuthClientConfig & {
  returnTo?: string;
  module?: AuthLoginModule;
  rememberMe?: boolean;
};

/** Builds a Google organization-owner signup URL without causing browser navigation. */
export function buildGoogleOwnerSignupUrl(options?: GoogleOwnerSignupOptions) {
  const clientConfig = resolveAuthClientConfig(options);
  const params = new URLSearchParams({
    module: options?.module ?? "enterprise",
    frontend_origin: resolveFrontendOrigin(options),
    return_to: options?.returnTo ?? clientConfig.callbackPath,
    rememberMe: String(options?.rememberMe ?? false),
  });

  return `${clientConfig.googleOwnerSignupEndpoint}?${params.toString()}`;
}

/** Starts Google OAuth for organization-owner signup using full browser navigation. */
export function startGoogleOwnerSignup(options?: GoogleOwnerSignupOptions) {
  window.location.assign(buildGoogleOwnerSignupUrl(options));
}
