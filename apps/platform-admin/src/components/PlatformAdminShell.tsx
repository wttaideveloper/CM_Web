"use client";

import { getShellAppOrigin } from "@ihp/auth";
import {
  PlatformAdminLayout,
  platformNavigationGroups,
  type PlatformNavigationItem,
} from "@ihp/platform-layout";
import { PlatformApprovalDataProvider, PlatformEnterpriseReadProvider, usePendingEventApprovalCount, usePendingTrainingApprovalCount } from "@ihp/platform-configuration";
import { getPlatformEnterpriseById } from "@ihp/platform-enterprises";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import PlatformBuilderAuthGate from "@/components/PlatformBuilderAuthGate";
import { getProfileDisplayName, getProfileInitials, getSuperAdminProfile, superAdminProfileQueryKey } from "@/lib/super-admin-profile";

function getShellRoute(pathname: string) {
  const shellOrigin = getShellAppOrigin();

  return shellOrigin ? new URL(pathname, shellOrigin).toString() : pathname;
}

const platformOwnedNavigationRoutes = new Set([
  "/dashboard",
  "/approval-queue",
  "/tenant-applications",
  "/onboarding-forms",
  "/form-builder-new",
  "/workflow-builder-new",
  "/form-configurations",
  "/training-forms",
  "/training-form-configurations",
  "/enterprise-types",
  "/categories",
  "/sub-admins",
  "/attributes",
  "/products",
  "/services",
  "/enterprises",
  "/users",
  "/super-admins",
  "/events",
  "/trainings",
  "/integrations",
  "/profile",
  "/account-settings",
  "/building-pages",
]);

export default function PlatformAdminShell({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformBuilderAuthGate>
        <PlatformEnterpriseReadProvider enterpriseLoader={getPlatformEnterpriseById}>
          <PlatformApprovalDataProvider>
            <PlatformAdminShellContent>{children}</PlatformAdminShellContent>
          </PlatformApprovalDataProvider>
        </PlatformEnterpriseReadProvider>
      </PlatformBuilderAuthGate>
    </QueryClientProvider>
  );
}

function PlatformAdminShellContent({ children }: { children: ReactNode }) {
  const profileQuery = useQuery({
    queryKey: superAdminProfileQueryKey,
    queryFn: getSuperAdminProfile,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
  const profile = profileQuery.data ?? null;
  const pathname = usePathname();
  const pendingEventApprovals = usePendingEventApprovalCount();
  const pendingTrainingApprovals = usePendingTrainingApprovalCount();
  const homeHref = useMemo(() => "/dashboard", []);
  const notificationsHref = useMemo(() => getShellRoute("/admin/notifications"), []);
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
    const approvalBadge = pendingEventApprovals.data?.pagination.total !== undefined
      && pendingTrainingApprovals.data?.pagination.total !== undefined
      ? pendingEventApprovals.data.pagination.total + pendingTrainingApprovals.data.pagination.total
      : 0;
    return platformNavigationGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => item.href === "/approval-queue"
        ? { ...item, badge: approvalBadge && approvalBadge > 0 ? String(approvalBadge) : undefined }
        : item),
    }));
  }, [
    pendingEventApprovals.data,
    pendingTrainingApprovals.data,
  ]);

  return (
    <PlatformAdminLayout
      currentPath={pathname}
      homeHref={homeHref}
      notificationsHref={notificationsHref}
      approvalNotifications={{
        eventCount: pendingEventApprovals.data?.pagination.total ?? null,
        trainingCount: pendingTrainingApprovals.data?.pagination.total ?? null,
        approvalQueueHref: "/approval-queue",
      }}
      profileHref="/profile"
      onLogout={handleLogout}
      resolveNavigationHref={resolveNavigationHref}
      navigationGroups={navigationGroups}
      profileInitials={getProfileInitials(profile) ?? undefined}
      profileName={getProfileDisplayName(profile)}
      profileEmail={profile?.email ?? null}
    >
      {children}
    </PlatformAdminLayout>
  );
}
