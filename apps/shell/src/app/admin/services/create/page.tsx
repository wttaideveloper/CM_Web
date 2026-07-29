"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import { useTenant } from "@/contexts/TenantContext";
import AppShell from "@/components/layout/AppShell";
import { loadEnterpriseServiceProviderOptions } from "@/services/service-provider-options.service";
import { ServiceCreateScreen } from "@ihp/services";

export default function AdminCreateServicePage() {
  const { tenantId } = useTenant();

  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <AppShell>
          <ServiceCreateScreen
            mode="enterprise-admin"
            redirectTo="/admin/services"
            enterpriseId={enterpriseId}
            enterpriseName={enterpriseName}
            tenantId={tenantId ?? undefined}
            providerOptionsLoader={loadEnterpriseServiceProviderOptions}
          />
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
