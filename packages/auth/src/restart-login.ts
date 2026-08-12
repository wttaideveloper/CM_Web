import { resolveAuthClientConfig, resolveFrontendOrigin, type AuthClientConfig } from "./client";

/** Starts a fresh Web Auth OIDC journey after the server clears the current app and OAuth cookies. */
export function restartLogin(config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  const params = new URLSearchParams({
    frontend_origin: resolveFrontendOrigin(config),
  });

  window.location.assign(`${clientConfig.restartLoginEndpoint}?${params.toString()}`);
}
