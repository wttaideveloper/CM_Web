"use client";

import {
  buildShellLoginUrlForPlatform,
  getPlatformAdminAppOrigin,
  useAuth,
} from "@ihp/auth";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import {
  hasTemporaryPlatformWorkflowAccess,
  isTemporaryPlatformWorkflowAccessConfigured,
} from "@/lib/temporary-platform-workflow-access";

type PlatformBuilderAuthGateProps = {
  children: ReactNode;
};

/**
 * Isolates Web Auth and the temporary fixed-user access check to Platform builder routes.
 */
export default function PlatformBuilderAuthGate({ children }: PlatformBuilderAuthGateProps) {
  const { authenticated, isLoading, userId } = useAuth();
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
    if (isLoading || authenticated || !shellLoginUrl || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    window.location.assign(shellLoginUrl);
  }, [authenticated, isLoading, shellLoginUrl]);

  if (isLoading) {
    return (
      <main
        aria-busy="true"
        className="flex min-h-screen items-center justify-center bg-white px-6 text-sm font-medium text-[#52736a]"
      >
        Restoring your secure session...
      </main>
    );
  }

  if (!authenticated) {
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

  if (!userId || !hasTemporaryPlatformWorkflowAccess(userId)) {
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
