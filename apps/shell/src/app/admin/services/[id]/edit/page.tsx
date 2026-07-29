"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { loadEnterpriseServiceProviderOptions } from "@/services/service-provider-options.service";
import { ServiceEditScreen } from "@ihp/services";

export default function AdminEditServicePage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <AppShell>
          <ServiceEditScreen
            enterpriseFilterId={enterpriseId}
            listHref="/admin/services"
            detailHrefBase="/admin/services"
            providerOptionsLoader={loadEnterpriseServiceProviderOptions}
          />
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
