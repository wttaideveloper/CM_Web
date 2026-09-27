"use client";

import {
  buildShellLoginUrlForPlatform,
  getPlatformAdminAppOrigin,
} from "@ihp/auth";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

type PlatformBuilderAuthGateProps = {
  children: ReactNode;
};

/**
 * Protects Platform builder routes with the normal Web Auth session gate.
 */
export default function PlatformBuilderAuthGate({ children }: PlatformBuilderAuthGateProps) {
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const sessionQuery = useQuery({
    queryKey: ["platform", "super-admin-session"],
    queryFn: async () => {
      const response = await fetch("/api/platform-super-admin/session", { credentials: "include", cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (response.status === 401 && typeof body === "object" && body !== null && "authenticated" in body && body.authenticated === false) return false;
      if (!response.ok || typeof body !== "object" || body === null || !("authenticated" in body) || body.authenticated !== true) throw new Error("Unable to verify the Super Admin session.");
      return true;
    },
    retry: false,
    staleTime: 0,
  });
  const authenticated = sessionQuery.data === true;
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
    if (sessionQuery.isPending || authenticated || !shellLoginUrl || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    window.location.assign(shellLoginUrl);
  }, [authenticated, sessionQuery.isPending, shellLoginUrl]);

  if (sessionQuery.isPending) {
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

  return children;
}
