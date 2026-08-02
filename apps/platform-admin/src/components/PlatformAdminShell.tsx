"use client";

import { getShellAppOrigin } from "@ihp/auth";
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
  "/approval-queue",
  "/onboarding-forms",
  "/enterprise-types",
  "/categories",
  "/sub-admins",
  "/attributes",
  "/products",
  "/services",
]);

export default function PlatformAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const homeHref = useMemo(() => getShellRoute("/dashboard"), []);
  const notificationsHref = useMemo(() => getShellRoute("/notifications"), []);
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
      resolveNavigationHref={resolveNavigationHref}
    >
      {children}
    </PlatformAdminLayout>
  );
}
