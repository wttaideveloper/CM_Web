"use client";

import { PlatformDashboardScreen } from "@ihp/platform-dashboard";
import { getPlatformEnterprises } from "@ihp/platform-enterprises";
import { getEventApprovalList, getTrainingApprovalList } from "@ihp/platform-configuration";
import { getSuperAdminProfile } from "@/lib/super-admin-profile";

async function getPendingApplications() {
  const response = await fetch("/api/platform-super-admin/tenant-applications?status=under_review", { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load pending applications.");
  const body = await response.json() as { data?: unknown };
  return Array.isArray(body.data) ? body.data as import("@ihp/platform-dashboard").PendingApplication[] : [];
}

async function getApprovalActivity(): Promise<import("@ihp/platform-dashboard").DashboardApprovalActivity[]> {
  const [events, trainings, tenants] = await Promise.all([
    getEventApprovalList("pending_approval", 1, ""),
    getTrainingApprovalList("pending_approval", 1, ""),
    getPendingApplications(),
  ]);
  return [
    ...events.items.map((item) => ({ id: item.id, kind: "event" as const, title: item.title, detail: "Event approval", createdAt: null })),
    ...trainings.items.map((item) => ({ id: item.id, kind: "training" as const, title: item.title, detail: "Training approval", createdAt: item.created_at ?? null })),
    ...tenants.map((item) => ({ id: item.id, kind: "tenant" as const, title: item.tenantName || item.name || "Unnamed application", detail: item.industryType || "Tenant application", createdAt: item.submittedAt ?? null })),
  ];
}

export function PlatformDashboardClient() {
  return (
    <PlatformDashboardScreen
      approvalQueueHref="/approval-queue"
      newEnterpriseHref="/enterprises/create"
      enterprisesLoader={getPlatformEnterprises}
      profileLoader={getSuperAdminProfile}
      pendingApplicationsLoader={getPendingApplications}
      approvalActivityLoader={getApprovalActivity}
    />
  );
}
