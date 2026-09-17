"use client";

import { useTenant } from "@ihp/enterprise-runtime";
import { ProductCreateScreen } from "@ihp/products";
import { loadEnterpriseServiceProviderOptions } from "@/adapters/service-provider-options";

import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseListingManagementGuard from "@/components/EnterpriseListingManagementGuard";

export default function EnterpriseCreateProductPage() {
  const { tenantId } = useTenant();

  return (
    <EnterpriseListingManagementGuard redirectTo="/admin/products">
      <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <ProductCreateScreen
          mode="enterprise-admin"
          redirectTo="/admin/products"
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
