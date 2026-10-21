"use client";

import { ServicesListScreen } from "@ihp/services";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { isInternalUserRole, useAuth } from "@ihp/auth";
import { EnterpriseCatalogManagement } from "@/components/EnterpriseCatalogManagement";

export default function EnterpriseServicesPage() {
  const { roles } = useAuth();
  const readOnly = isInternalUserRole(roles?.tenantRole);
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <EnterpriseCatalogManagement module="service"><ServicesListScreen
          enterpriseFilterId={enterpriseId}
          enterpriseName={enterpriseName}
          createHref="/admin/services/create"
          detailHrefBase="/admin/services"
          editHrefBase="/admin/services"
          readOnly={readOnly}
        /></EnterpriseCatalogManagement>
      )}
    </CurrentEnterpriseGuard>
  );
}
