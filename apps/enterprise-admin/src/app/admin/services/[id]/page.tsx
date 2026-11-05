"use client";

import { ServiceDetailsScreen } from "@ihp/services";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { isInternalUserRole, useAuth } from "@ihp/auth";
import { useParams } from "next/navigation";
import { EnterpriseCatalogManagement } from "@/components/EnterpriseCatalogManagement";
import { ContextualModuleBlogsTab } from "@ihp/enterprise-dashboard";

export default function EnterpriseServiceDetailsPage() {
  const { roles } = useAuth();
  const params = useParams<{ id: string }>();
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <EnterpriseCatalogManagement module="service" itemId={params.id}>
          <ServiceDetailsScreen
            enterpriseFilterId={enterpriseId}
            listHref="/admin/services"
            editHrefBase="/admin/services"
            readOnly={isInternalUserRole(roles?.tenantRole)}
            blogsTab={(service) => <ContextualModuleBlogsTab module="services" entityId={service.id} entityTitle={service.service_name || "Service"} />}
          />
        </EnterpriseCatalogManagement>
      )}
    </CurrentEnterpriseGuard>
  );
}
