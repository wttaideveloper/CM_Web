"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ServicesListScreen } from "@ihp/services";
import { EnterpriseCatalogManagement } from "@/components/enterprise/EnterpriseCatalogManagement";

export default function AdminServicesPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <AppShell>
          <EnterpriseCatalogManagement module="service">
            <ServicesListScreen
              enterpriseFilterId={enterpriseId}
              enterpriseName={enterpriseName}
              createHref="/admin/services/create"
              detailHrefBase="/admin/services"
              editHrefBase="/admin/services"
            />
          </EnterpriseCatalogManagement>
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
