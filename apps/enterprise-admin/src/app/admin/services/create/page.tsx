"use client";

import { useTenant } from "@ihp/enterprise-runtime";
import { ServiceCreateScreen } from "@ihp/services";

import { loadEnterpriseServiceProviderOptions } from "@/adapters/service-provider-options";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseCreateServicePage() {
  const { tenantId } = useTenant();

  return (
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
  );
}
