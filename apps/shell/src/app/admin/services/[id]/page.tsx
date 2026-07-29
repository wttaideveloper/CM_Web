"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ServiceDetailsScreen } from "@ihp/services";

export default function AdminServiceDetailsPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <AppShell>
          <ServiceDetailsScreen
            enterpriseFilterId={enterpriseId}
            listHref="/admin/services"
            editHrefBase="/admin/services"
          />
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
