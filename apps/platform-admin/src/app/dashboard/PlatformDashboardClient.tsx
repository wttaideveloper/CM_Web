"use client";

import { PlatformDashboardScreen } from "@ihp/platform-dashboard";
import { getPlatformEnterprises } from "@ihp/platform-enterprises";

export function PlatformDashboardClient() {
  return (
    <PlatformDashboardScreen
      approvalQueueHref="/approval-queue"
      newEnterpriseHref="/enterprises/create"
      enterprisesLoader={getPlatformEnterprises}
    />
  );
}
