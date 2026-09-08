"use client";

import { getShellAppOrigin } from "@ihp/auth";
import {
  PlatformAdminLayout,
  platformNavigationGroups,
  type PlatformNavigationItem,
} from "@ihp/platform-layout";
import { PlatformApprovalDataProvider, PlatformEnterpriseReadProvider, usePendingEventApprovalCount } from "@ihp/platform-configuration";
import { getPlatformEnterpriseById } from "@ihp/platform-enterprises";
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
  "/form-configurations",
  "/enterprise-types",
  "/categories",
  "/sub-admins",
  "/attributes",
  "/products",
  "/services",
  "/enterprises",
  "/users",
  "/events",
  "/trainings",
  "/integrations",
]);

export default function PlatformAdminShell({ children }: { children: ReactNode }) {
  return (
    <PlatformEnterpriseReadProvider enterpriseLoader={getPlatformEnterpriseById}>
      <PlatformApprovalDataProvider>
        <PlatformAdminShellContent>{children}</PlatformAdminShellContent>
      </PlatformApprovalDataProvider>
    </PlatformEnterpriseReadProvider>
  );
}

function PlatformAdminShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pendingApprovals = usePendingEventApprovalCount();
  const homeHref = useMemo(() => "/dashboard", []);
  const notificationsHref = useMemo(() => getShellRoute("/notifications"), []);
  const handleLogout = useCallback(async () => {
    const shellOrigin = getShellAppOrigin();

    try {
      await fetch("/api/platform-super-admin/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      if (shellOrigin) {
        window.location.assign(new URL("/auth/login", shellOrigin).toString());
      }
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
