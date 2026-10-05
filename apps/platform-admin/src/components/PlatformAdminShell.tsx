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
import { usePlatformWorkflowNotifications } from "@/components/PlatformWorkflowNotifications";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getPendingEnterpriseRequestCount(): Promise<number> {
  const response = await fetch("/api/platform-super-admin/tenant-applications?status=under_review", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load pending Enterprise requests.");
  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new Error("Tenant Applications returned an invalid pending-request response.");
  }
  const pagination = isRecord(body.pagination) ? body.pagination : null;
  const total = pagination?.total;
  return typeof total === "number" && Number.isFinite(total) && total >= 0
    ? total
    : body.data.length;
}

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
  const workflowNotifications = usePlatformWorkflowNotifications();
  const pendingEnterpriseRequests = useQuery({
    queryKey: ["platform", "tenant-applications", "under-review-count"],
    queryFn: getPendingEnterpriseRequestCount,
    staleTime: 0,
    retry: 1,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const homeHref = useMemo(() => "/dashboard", []);
  const notificationsHref = useMemo(() => "/notifications", []);
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
      items: group.items.map((item) => {
        if (item.href === "/approval-queue") {
          return { ...item, badge: approvalBadge > 0 ? String(approvalBadge) : undefined };
        }
        if (item.href === "/tenant-applications") {
          const count = pendingEnterpriseRequests.data ?? 0;
          return { ...item, badge: count > 0 ? (count > 99 ? "99+" : String(count)) : undefined };
        }
        return item;
      }),
    }));
  }, [
    pendingEventApprovals.data,
    pendingTrainingApprovals.data,
    pendingEnterpriseRequests.data,
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
        enterpriseRequestCount: pendingEnterpriseRequests.data ?? null,
        tenantApplicationsHref: "/tenant-applications",
      }}
      workflowNotifications={{
        unreadCount: workflowNotifications.unreadCount,
        unreadCountError: workflowNotifications.unreadCountError,
        items: workflowNotifications.items,
        onRead: (id) => { void workflowNotifications.markRead(id); },
        onMarkAllRead: () => { void workflowNotifications.markAllRead(); },
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
