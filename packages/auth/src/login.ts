import { resolveAuthClientConfig, resolveFrontendOrigin, type AuthClientConfig } from "./client";

export function startLogin(config?: AuthClientConfig) {
  const clientConfig = resolveAuthClientConfig(config);
  const frontendOrigin = resolveFrontendOrigin(config);
  const params = new URLSearchParams({
    module: "enterprise",
    frontend_origin: frontendOrigin,
    return_to: clientConfig.callbackPath,
    rememberMe: "false",
  });
  const url = `${clientConfig.loginEndpoint}?${params.toString()}`;

  if (process.env.NODE_ENV === "development") {
    console.log("[AUTH DEBUG] Login initiated");
    console.log("[AUTH DEBUG] Browser origin:", window.location.origin);
    console.log("[AUTH DEBUG] Login endpoint:", clientConfig.loginEndpoint);
    console.log("[AUTH DEBUG] module:", "enterprise");
    console.log("[AUTH DEBUG] frontend_origin:", frontendOrigin);
    console.log("[AUTH DEBUG] return_to:", clientConfig.callbackPath);
    console.log("[AUTH DEBUG] rememberMe:", "false");
    console.log("[AUTH DEBUG] Browser request URL:", url);
  }

  window.location.assign(url);
}
