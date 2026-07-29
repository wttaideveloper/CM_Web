"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ServicesListScreen } from "@ihp/services";

export default function AdminServicesPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <AppShell>
          <ServicesListScreen
            enterpriseFilterId={enterpriseId}
            enterpriseName={enterpriseName}
            createHref="/admin/services/create"
            detailHrefBase="/admin/services"
            editHrefBase="/admin/services"
          />
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
