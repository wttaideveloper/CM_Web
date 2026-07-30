"use client";

import { ServiceEditScreen } from "@ihp/services";
import { loadEnterpriseServiceProviderOptions } from "@/adapters/service-provider-options";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseServiceEditPage() {
  return (
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
  );
}
