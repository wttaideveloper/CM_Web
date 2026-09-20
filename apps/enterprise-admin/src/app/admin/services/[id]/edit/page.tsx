"use client";

import { ServiceEditScreen } from "@ihp/services";
import { loadEnterpriseServiceProviderOptions } from "@/adapters/service-provider-options";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseListingManagementGuard from "@/components/EnterpriseListingManagementGuard";

export default function EnterpriseServiceEditPage() {
  return (
    <EnterpriseListingManagementGuard redirectTo="/admin/services">
      <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <ServiceEditScreen
          enterpriseFilterId={enterpriseId}
          listHref="/admin/services"
          detailHrefBase="/admin/services"
          providerOptionsLoader={loadEnterpriseServiceProviderOptions}
        />
      )}
      </CurrentEnterpriseGuard>
    </EnterpriseListingManagementGuard>
  );
}
