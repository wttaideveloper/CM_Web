export type PlatformDashboardScreenProps = {
  newEnterpriseHref?: string;
  approvalQueueHref?: string;
  enterprisesLoader?: () => Promise<import("@ihp/enterprises").EnterpriseDto[]>;
  profileLoader?: () => Promise<{ fullName?: string; name?: string; username?: string } | null>;
  pendingApplicationsLoader?: () => Promise<PendingApplication[]>;
  approvalActivityLoader?: () => Promise<DashboardApprovalActivity[]>;
};

export type PendingApplication = { id: string; name?: string; tenantName?: string; industryType?: string; submittedAt?: string | null; status: string };
export type DashboardApprovalActivity = { id: string; kind: "event" | "training" | "tenant"; title: string; detail: string; createdAt?: string | null };
