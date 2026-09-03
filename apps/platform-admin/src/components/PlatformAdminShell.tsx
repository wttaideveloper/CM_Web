"use client";

import { getShellAppOrigin, logoutWebAuth } from "@ihp/auth";
import {
  PlatformAdminLayout,
  platformNavigationGroups,
  type PlatformNavigationItem,
} from "@ihp/platform-layout";
import { PlatformApprovalDataProvider, usePendingEventApprovalCount } from "@ihp/platform-configuration";
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
  "/form-builder-new",
  "/workflow-builder-new",
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
  return <PlatformApprovalDataProvider><PlatformAdminShellContent>{children}</PlatformAdminShellContent></PlatformApprovalDataProvider>;
}

function PlatformAdminShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pendingApprovals = usePendingEventApprovalCount();
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
  const navigationGroups = useMemo(() => {
    const approvalBadge = pendingApprovals.data?.pagination.total;
    return platformNavigationGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => item.href === "/approval-queue"
        ? { ...item, badge: approvalBadge && approvalBadge > 0 ? String(approvalBadge) : undefined }
        : item),
    }));
  }, [pendingApprovals.data?.pagination.total]);

  return (
    <PlatformAdminLayout
      currentPath={pathname}
      homeHref={homeHref}
      notificationsHref={notificationsHref}
      onLogout={handleLogout}
      resolveNavigationHref={resolveNavigationHref}
      navigationGroups={navigationGroups}
    >
      {children}
    </PlatformAdminLayout>
  );
}
