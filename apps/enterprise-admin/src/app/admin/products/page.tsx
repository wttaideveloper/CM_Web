"use client";

import { ProductsListScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { getShellRoute } from "@/lib/shell-route";

export default function EnterpriseProductsPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <ProductsListScreen
          enterpriseFilterId={enterpriseId}
          enterpriseName={enterpriseName}
          createHref={getShellRoute("/admin/products/create")}
          detailHrefBase="/admin/products"
          editHrefBase="/admin/products"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
