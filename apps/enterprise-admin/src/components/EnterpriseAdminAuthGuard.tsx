"use client";

import { useCallback, type ReactNode } from "react";

import { buildShellLoginUrl, getShellAppOrigin, RequireAuthenticated } from "@ihp/auth";

export default function EnterpriseAdminAuthGuard({ children }: { children: ReactNode }) {
  const shellOrigin = getShellAppOrigin();
  const redirectToShellLogin = useCallback(() => {
    const loginUrl = buildShellLoginUrl(window.location.href);
    if (loginUrl) {
      window.location.replace(loginUrl);
    }
  }, []);

  if (!shellOrigin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm font-semibold text-[#52736a]">
        Enterprise Admin authentication requires a configured Shell origin.
      </main>
    );
  }

  return (
    <RequireAuthenticated
      unauthenticatedRedirectPath={shellOrigin}
      redirect={redirectToShellLogin}
      loadingFallback={(
        <main className="flex min-h-screen items-center justify-center bg-white text-sm font-semibold text-[#52736a]">
          Checking your session...
        </main>
      )}
    >
      {children}
    </RequireAuthenticated>
  );
}
