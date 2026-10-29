"use client";

import { useTenant } from "@ihp/enterprise-runtime";
import { ServiceCreateScreen } from "@ihp/services";

import { loadEnterpriseServiceProviderOptions } from "@/adapters/service-provider-options";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseListingManagementGuard from "@/components/EnterpriseListingManagementGuard";

export default function EnterpriseCreateServicePage() {
  const { tenantId } = useTenant();

  return (
    <EnterpriseListingManagementGuard redirectTo="/admin/services">
      <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <ServiceCreateScreen
          mode="enterprise-admin"
          redirectTo="/admin/services"
          enterpriseId={enterpriseId}
          enterpriseName={enterpriseName}
          tenantId={tenantId ?? undefined}
          providerOptionsLoader={loadEnterpriseServiceProviderOptions}
        />
      )}
      </CurrentEnterpriseGuard>
    </EnterpriseListingManagementGuard>
  );
}
