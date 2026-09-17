"use client";

import { ServiceDetailsScreen } from "@ihp/services";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { isInternalUserRole, useAuth } from "@ihp/auth";

export default function EnterpriseServiceDetailsPage() {
  const { roles } = useAuth();
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <ServiceDetailsScreen
          enterpriseFilterId={enterpriseId}
          listHref="/admin/services"
          editHrefBase="/admin/services"
          readOnly={isInternalUserRole(roles?.tenantRole)}
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
