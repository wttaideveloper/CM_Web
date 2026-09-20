"use client";

import { ProductDetailsScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { isInternalUserRole, useAuth } from "@ihp/auth";

export default function EnterpriseProductDetailsPage() {
  const { roles } = useAuth();
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <ProductDetailsScreen
          enterpriseFilterId={enterpriseId}
          listHref="/admin/products"
          editHrefBase="/admin/products"
          readOnly={isInternalUserRole(roles?.tenantRole)}
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
