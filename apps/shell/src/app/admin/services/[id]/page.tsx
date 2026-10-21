"use client";

import { useParams } from "next/navigation";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ServiceDetailsScreen } from "@ihp/services";
import { EnterpriseCatalogManagement } from "@/components/enterprise/EnterpriseCatalogManagement";

export default function AdminServiceDetailsPage() {
  const params = useParams<{ id: string }>();
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <AppShell>
          <EnterpriseCatalogManagement module="service" itemId={params.id}>
            <ServiceDetailsScreen
              enterpriseFilterId={enterpriseId}
              listHref="/admin/services"
              editHrefBase="/admin/services"
            />
          </EnterpriseCatalogManagement>
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
