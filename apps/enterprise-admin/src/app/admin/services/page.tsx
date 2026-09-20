"use client";

import { ServicesListScreen } from "@ihp/services";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { isInternalUserRole, useAuth } from "@ihp/auth";

export default function EnterpriseServicesPage() {
  const { roles } = useAuth();
  const readOnly = isInternalUserRole(roles?.tenantRole);
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <ServicesListScreen
          enterpriseFilterId={enterpriseId}
          enterpriseName={enterpriseName}
          createHref="/admin/services/create"
          detailHrefBase="/admin/services"
          editHrefBase="/admin/services"
          readOnly={readOnly}
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
