"use client";

import { PlatformDashboardScreen } from "@ihp/platform-dashboard";
import { getPlatformEnterprises } from "@ihp/platform-enterprises";
import { getSuperAdminProfile } from "@/lib/super-admin-profile";

async function getPendingApplications() {
  const response = await fetch("/api/platform-super-admin/tenant-applications?status=under_review", { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load pending applications.");
  const body = await response.json() as { data?: unknown };
  return Array.isArray(body.data) ? body.data as import("@ihp/platform-dashboard").PendingApplication[] : [];
}

export function PlatformDashboardClient() {
  return (
    <PlatformDashboardScreen
      approvalQueueHref="/approval-queue"
      newEnterpriseHref="/enterprises/create"
      enterprisesLoader={getPlatformEnterprises}
      profileLoader={getSuperAdminProfile}
      pendingApplicationsLoader={getPendingApplications}
    />
  );
}
