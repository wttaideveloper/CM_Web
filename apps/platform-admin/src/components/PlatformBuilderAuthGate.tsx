"use client";

import {
  buildShellLoginUrlForPlatform,
  getPlatformAdminAppOrigin,
  useAuth,
} from "@ihp/auth";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  hasTemporaryPlatformWorkflowAccess,
  isTemporaryPlatformWorkflowAccessConfigured,
} from "@/lib/temporary-platform-workflow-access";

type PlatformBuilderAuthGateProps = {
  children: ReactNode;
};

type SuperAdminSessionResponse = {
  authenticated: true;
  userId: string;
};

/**
 * Isolates Web Auth and the temporary fixed-user access check to Platform builder routes.
 */
export default function PlatformBuilderAuthGate({ children }: PlatformBuilderAuthGateProps) {
  const { authenticated, isLoading, userId } = useAuth();
  const [superAdminSession, setSuperAdminSession] = useState<{
    isLoading: boolean;
    authenticated: boolean;
    userId: string | null;
  }>({ isLoading: true, authenticated: false, userId: null });
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const shellLoginUrl = useMemo(() => {
    const platformAdminOrigin = getPlatformAdminAppOrigin();
    if (!platformAdminOrigin) {
      return null;
    }

    return buildShellLoginUrlForPlatform(
      new URL(pathname, platformAdminOrigin).toString(),
    );
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/platform-super-admin/session", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const body: unknown = await response.json();
        if (
          typeof body !== "object" ||
          body === null ||
          !("authenticated" in body) ||
          body.authenticated !== true ||
          !("userId" in body) ||
          typeof body.userId !== "string"
        ) {
          return null;
        }

        return body as SuperAdminSessionResponse;
      })
      .then((session) => {
        if (cancelled) {
          return;
        }

        setSuperAdminSession({
          isLoading: false,
          authenticated: session !== null,
          userId: session?.userId ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSuperAdminSession({
            isLoading: false,
            authenticated: false,
            userId: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveAuthenticated =
    authenticated || superAdminSession.authenticated;
  const effectiveUserId = superAdminSession.authenticated
    ? superAdminSession.userId
    : userId;

  useEffect(() => {
    if (
      isLoading ||
      superAdminSession.isLoading ||
      effectiveAuthenticated ||
      !shellLoginUrl ||
      hasRedirectedRef.current
    ) {
      return;
    }

    hasRedirectedRef.current = true;
    window.location.assign(shellLoginUrl);
  }, [
    effectiveAuthenticated,
    isLoading,
    shellLoginUrl,
    superAdminSession.isLoading,
  ]);

  if (isLoading || superAdminSession.isLoading) {
    return (
      <main
        aria-busy="true"
        className="flex min-h-screen items-center justify-center bg-white px-6 text-sm font-medium text-[#52736a]"
      >
        Restoring your secure session...
      </main>
    );
  }

  if (!effectiveAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm font-medium text-[#52736a]">
        {shellLoginUrl
          ? "Redirecting to secure sign in..."
          : "Secure sign-in is unavailable because the Platform or Shell origin is not configured."}
      </main>
    );
  }

  if (!isTemporaryPlatformWorkflowAccessConfigured()) {
    return (
      <main
        role="alert"
        className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm font-medium text-[#8b3d1f]"
      >
        Temporary Platform workflow access is not configured for this environment.
      </main>
    );
  }

  if (!effectiveUserId || !hasTemporaryPlatformWorkflowAccess(effectiveUserId)) {
    return (
      <main
        role="alert"
        className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm font-medium text-[#8b3d1f]"
      >
        Access denied. Your account is not approved for temporary Platform workflow access.
      </main>
    );
  }

  return children;
}
