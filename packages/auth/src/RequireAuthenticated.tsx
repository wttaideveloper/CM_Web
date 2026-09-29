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
  const { authenticated, hasSessionError, isLoading, refreshSession } = useAuth();
  const clientConfig = resolveAuthClientConfig(config);
  const redirectPath = unauthenticatedRedirectPath ?? clientConfig.unauthenticatedRedirectPath;

  useEffect(() => {
    if (isLoading || authenticated || hasSessionError) {
      return;
    }

    if (redirect) {
      redirect(redirectPath);
      return;
    }

    window.location.replace(redirectPath);
  }, [authenticated, hasSessionError, isLoading, redirect, redirectPath]);

  if (isLoading || !authenticated) {
    if (hasSessionError) {
      return (
        <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-sm text-[#52736a]">
          <p>Unable to verify your session right now.</p>
          <button
            type="button"
            onClick={() => void refreshSession()}
            className="rounded-lg px-3 py-2 font-semibold text-[#1f6a58] transition hover:bg-[#f1f7f4] hover:text-[#124a3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]"
          >
            Retry
          </button>
        </main>
      );
    }

    return loadingFallback;
  }

  return children;
}
