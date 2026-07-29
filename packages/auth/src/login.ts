import { resolveAuthClientConfig, resolveFrontendOrigin, type AuthClientConfig } from "./client";

export function startLogin(config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  const params = new URLSearchParams({
    frontend_origin: resolveFrontendOrigin(config),
    return_to: clientConfig.callbackPath,
    rememberMe: "false",
  });

  window.location.assign(`${clientConfig.loginEndpoint}?${params.toString()}`);
}
