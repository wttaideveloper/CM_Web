"use client";

import { buildShellLoginUrlForPlatform, getPlatformAdminAppOrigin } from "@ihp/auth";
import { useTrainingFormConfigurations } from "@ihp/platform-form-configurations";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

type PlatformTrainingAuthGateProps = { children: ReactNode };

/**
 * Verifies a real Platform Super Admin session before rendering Training
 * management pages (list, approval queue, dynamic form configuration).
 *
 * A WebAuth/tenant session cannot tell a Super Admin apart from an Enterprise
 * Admin — Super Admin identity is a separate, dedicated session, readable
 * only server-side (see `packages/auth/src/super-admin-auth.ts` and
 * `apps/platform-admin/src/lib/super-admin-server-client.ts`). We confirm it
 * the same way the rest of this app already does: by calling an existing
 * Super-Admin-only BFF endpoint that is already cookie-gated server-side by
 * `ihp_super_admin_refresh`. `useTrainingFormConfigurations` already exists
 * to power the configuration list page — reusing it here as a lightweight
 * identity probe avoids adding any new backend surface. Any failure
 * (401/403/network) is treated as "not a verified Super Admin."
 */
export default function PlatformTrainingAuthGate({ children }: PlatformTrainingAuthGateProps) {
  const verifyQuery = useTrainingFormConfigurations();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  const shellLoginUrl = useMemo(() => {
    const platformAdminOrigin = getPlatformAdminAppOrigin();
    if (!platformAdminOrigin) return null;
    return buildShellLoginUrlForPlatform(new URL(pathname, platformAdminOrigin).toString());
  }, [pathname]);

  const denied = verifyQuery.isError;

  useEffect(() => {
    if (!denied || !shellLoginUrl || hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    window.location.assign(shellLoginUrl);
  }, [denied, shellLoginUrl]);

  if (verifyQuery.isLoading) {
    return (
      <main
        aria-busy="true"
        className="flex min-h-screen items-center justify-center bg-white px-6 text-sm font-medium text-[#52736a]"
      >
        Verifying your Super Admin session...
      </main>
    );
  }

  if (denied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm font-medium text-[#52736a]">
        {shellLoginUrl
          ? "Redirecting to secure sign in..."
          : "Secure sign-in is unavailable because the Platform or Shell origin is not configured."}
      </main>
    );
  }

  return children;
}
