"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/services/auth.service";

const ALLOWED_ADMIN_ROLES = new Set(["tenant_owner", "tenant_admin", "admin"]);

function getTenantRole(authenticatedUser: AuthUser | null): string | null {
  return authenticatedUser?.membership?.tenantRole ?? authenticatedUser?.roles?.tenantRole ?? null;
}

function isAllowedAdminRole(tenantRole: string | null) {
  if (!tenantRole) {
    return false;
  }

  return ALLOWED_ADMIN_ROLES.has(tenantRole);
}

function AdminLayoutLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#06201c]">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#e1ebe6] bg-white px-6 py-8 shadow-sm">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#dceae4] border-t-[#1f6a58]" />
        <div className="text-center">
          <h1 className="text-lg font-bold text-[#06201c]">Checking session...</h1>
          <p className="mt-1 text-sm text-[#52736a]">Verifying your Enterprise Owner access.</p>
        </div>
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { authenticatedUser, isAuthLoading, isAuthenticated, restoreSession } = useAuth();

  const tenantRole = getTenantRole(authenticatedUser);
  const hasAdminAccess = isAuthenticated && isAllowedAdminRole(tenantRole);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Admin guard] tenant role", tenantRole);
    }

    if (isAuthLoading) {
      return;
    }

    if (!hasAdminAccess) {
      router.replace("/auth/login");
    }
  }, [hasAdminAccess, isAuthLoading, router, tenantRole]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      void restoreSession();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [restoreSession]);

  if (isAuthLoading || !hasAdminAccess) {
    return <AdminLayoutLoading />;
  }

  return children;
}
