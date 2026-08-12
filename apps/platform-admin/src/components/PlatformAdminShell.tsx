"use client";

import { getShellAppOrigin, logoutWebAuth } from "@ihp/auth";
import {
  PlatformAdminLayout,
  type PlatformNavigationItem,
} from "@ihp/platform-layout";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";

function getShellRoute(pathname: string) {
  const shellOrigin = getShellAppOrigin();

  return shellOrigin ? new URL(pathname, shellOrigin).toString() : pathname;
}

const platformOwnedNavigationRoutes = new Set([
  "/dashboard",
  "/approval-queue",
  "/onboarding-forms",
  "/enterprise-types",
  "/categories",
  "/sub-admins",
  "/attributes",
  "/products",
  "/services",
  "/enterprises",
  "/events",
  "/trainings",
  "/integrations",
]);

export default function PlatformAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const homeHref = useMemo(() => "/dashboard", []);
  const notificationsHref = useMemo(() => getShellRoute("/notifications"), []);
  const handleLogout = useCallback(async () => {
    const shellOrigin = getShellAppOrigin();
    if (!shellOrigin) {
      return;
    }

    try {
      const logoutUrl = await logoutWebAuth({ frontendOrigin: shellOrigin });
      window.location.assign(logoutUrl);
    } catch {
      // Preserve the protected screen if the existing Web Auth logout request fails.
    }
  }, []);
  const resolveNavigationHref = useCallback(
    (item: PlatformNavigationItem) =>
      platformOwnedNavigationRoutes.has(item.href) ? item.href : getShellRoute(item.href),
    [],
  );

  return (
    <PlatformAdminLayout
      currentPath={pathname}
      homeHref={homeHref}
      notificationsHref={notificationsHref}
      onLogout={handleLogout}
      resolveNavigationHref={resolveNavigationHref}
    >
      {children}
    </PlatformAdminLayout>
  );
}
