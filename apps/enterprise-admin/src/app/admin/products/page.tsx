"use client";

import { ProductsListScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { isInternalUserRole, useAuth } from "@ihp/auth";
import { EnterpriseCatalogManagement } from "@/components/EnterpriseCatalogManagement";

export default function EnterpriseProductsPage() {
  const { roles } = useAuth();
  const readOnly = isInternalUserRole(roles?.tenantRole);
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <EnterpriseCatalogManagement module="product"><ProductsListScreen
          enterpriseFilterId={enterpriseId}
          enterpriseName={enterpriseName}
          createHref="/admin/products/create"
          detailHrefBase="/admin/products"
          editHrefBase="/admin/products"
          readOnly={readOnly}
        /></EnterpriseCatalogManagement>
      )}
    </CurrentEnterpriseGuard>
  );
}
