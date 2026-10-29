"use client";

import { ProductDetailsScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { isInternalUserRole, useAuth } from "@ihp/auth";
import { useParams } from "next/navigation";
import { EnterpriseCatalogManagement } from "@/components/EnterpriseCatalogManagement";

export default function EnterpriseProductDetailsPage() {
  const { roles } = useAuth();
  const params = useParams<{ id: string }>();
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <EnterpriseCatalogManagement module="product" itemId={params.id}>
          <ProductDetailsScreen
            enterpriseFilterId={enterpriseId}
            listHref="/admin/products"
            editHrefBase="/admin/products"
            readOnly={isInternalUserRole(roles?.tenantRole)}
          />
        </EnterpriseCatalogManagement>
      )}
    </CurrentEnterpriseGuard>
  );
}
