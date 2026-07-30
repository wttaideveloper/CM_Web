"use client";

import { ServiceDetailsScreen } from "@ihp/services";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseServiceDetailsPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <ServiceDetailsScreen
          enterpriseFilterId={enterpriseId}
          listHref="/admin/services"
          editHrefBase="/admin/services"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
