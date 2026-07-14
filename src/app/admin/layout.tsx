"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminPath, resolveAdminLandingRoute } from "@/lib/admin-routing";

function AdminLayoutLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#06201c]">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#e1ebe6] bg-white px-6 py-8 shadow-sm">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#dceae4] border-t-[#1f6a58]" />
        <div className="text-center">
          <h1 className="text-lg font-bold text-[#06201c]">Checking session...</h1>
          <p className="mt-1 text-sm text-[#52736a]">Verifying your access.</p>
        </div>
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticatedUser, isAuthLoading, isAuthenticated, restoreSession } = useAuth();
  const tenantRole = authenticatedUser?.membership?.tenantRole ?? authenticatedUser?.roles?.tenantRole ?? null;
  const routeAccessAllowed = canAccessAdminPath(pathname, tenantRole);
  const resolvedDestinationRoute = isAuthenticated
    ? routeAccessAllowed
      ? pathname
      : resolveAdminLandingRoute(tenantRole)
    : "/auth/login";

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Admin guard] route decision", {
        authenticated: isAuthenticated,
        tenantRole,
        resolvedDestinationRoute,
        routeAccessAllowed,
      });
    }

    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!routeAccessAllowed) {
      router.replace(resolvedDestinationRoute);
    }
  }, [isAuthLoading, isAuthenticated, pathname, resolvedDestinationRoute, routeAccessAllowed, router, tenantRole]);

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

  if (isAuthLoading) {
    return <AdminLayoutLoading />;
  }

  if (!isAuthenticated || !routeAccessAllowed) {
    return <AdminLayoutLoading />;
  }

  return children;
}
