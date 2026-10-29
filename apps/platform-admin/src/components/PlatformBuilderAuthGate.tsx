"use client";

import {
  buildShellLoginUrlForPlatform,
  getPlatformAdminAppOrigin,
} from "@ihp/auth";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type PlatformBuilderAuthGateProps = {
  children: ReactNode;
};

/**
 * Protects Platform builder routes with the normal Web Auth session gate.
 */
export default function PlatformBuilderAuthGate({ children }: PlatformBuilderAuthGateProps) {
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
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
    refetchOnWindowFocus: true,
  });
  const refetchSession = sessionQuery.refetch;
  const authenticated = sessionQuery.data === true && !sessionQuery.isError;
  const shellLoginUrl = useMemo(() => {
    const platformAdminOrigin = getPlatformAdminAppOrigin();
    if (!platformAdminOrigin) {
      return null;
    }

    return buildShellLoginUrlForPlatform(
      new URL(pathname, platformAdminOrigin).toString(),
    );
  }, [pathname]);

  const revalidateRestoredSession = useCallback(async () => {
    setIsRestoringSession(true);
    try {
      await refetchSession();
    } finally {
      setIsRestoringSession(false);
    }
  }, [refetchSession]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void revalidateRestoredSession();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= 15 * 60 * 1000) {
        void revalidateRestoredSession();
      }
      hiddenAt = null;
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidateRestoredSession]);

  useEffect(() => {
    if (sessionQuery.isPending || sessionQuery.data !== false || !shellLoginUrl || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    window.location.assign(shellLoginUrl);
  }, [sessionQuery.data, sessionQuery.isPending, shellLoginUrl]);

  if (sessionQuery.isPending || isRestoringSession) {
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
    if (sessionQuery.isError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-white px-6">
          <section role="alert" className="max-w-md rounded-2xl border border-[#f0c8c4] bg-[#fff8f7] p-6 text-center">
            <p className="text-sm font-semibold text-[#b42318]">Unable to verify your Super Admin session right now.</p>
            <button
              type="button"
              onClick={() => void sessionQuery.refetch()}
              className="mt-3 text-sm font-bold text-[#1f6a58] underline"
            >
              Retry
            </button>
          </section>
        </main>
      );
    }

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
