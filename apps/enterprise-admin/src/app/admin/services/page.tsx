"use client";

import { ServicesListScreen } from "@ihp/services";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { getShellRoute } from "@/lib/shell-route";

export default function EnterpriseServicesPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <ServicesListScreen
          enterpriseFilterId={enterpriseId}
          enterpriseName={enterpriseName}
          createHref={getShellRoute("/admin/services/create")}
          detailHrefBase="/admin/services"
          editHrefBase="/admin/services"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
