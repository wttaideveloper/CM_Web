"use client";

import { ProductEditScreen } from "@ihp/products";
import { loadEnterpriseServiceProviderOptions } from "@/adapters/service-provider-options";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseListingManagementGuard from "@/components/EnterpriseListingManagementGuard";

export default function EnterpriseProductEditPage() {
  return (
    <EnterpriseListingManagementGuard redirectTo="/admin/products">
      <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <ProductEditScreen
          enterpriseFilterId={enterpriseId}
          listHref="/admin/products"
          detailHrefBase="/admin/products"
          providerOptionsLoader={loadEnterpriseServiceProviderOptions}
        />
      )}
      </CurrentEnterpriseGuard>
    </EnterpriseListingManagementGuard>
  );
}
