"use client";

import { useEffect, type ReactNode } from "react";

import { resolveAuthClientConfig, type AuthClientConfig } from "./client";
import { useAuth } from "./useAuth";

type RequireAuthenticatedProps = {
  children: ReactNode;
  config?: AuthClientConfig;
  unauthenticatedRedirectPath?: string;
  redirect?: (path: string) => void;
  loadingFallback?: ReactNode;
};

export function RequireAuthenticated({
  children,
  config,
  unauthenticatedRedirectPath,
  redirect,
  loadingFallback = null,
}: RequireAuthenticatedProps) {
  const { authenticated, isLoading } = useAuth();
  const clientConfig = resolveAuthClientConfig(config);
  const redirectPath = unauthenticatedRedirectPath ?? clientConfig.unauthenticatedRedirectPath;

  useEffect(() => {
    if (isLoading || authenticated) {
      return;
    }

    if (redirect) {
      redirect(redirectPath);
      return;
    }

    window.location.replace(redirectPath);
  }, [authenticated, isLoading, redirect, redirectPath]);

  if (isLoading || !authenticated) {
    return loadingFallback;
  }

  return children;
}
