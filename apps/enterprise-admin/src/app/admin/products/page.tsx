"use client";

import { ProductsListScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseProductsPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <ProductsListScreen
          enterpriseFilterId={enterpriseId}
          enterpriseName={enterpriseName}
          createHref="/admin/products/create"
          detailHrefBase="/admin/products"
          editHrefBase="/admin/products"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
