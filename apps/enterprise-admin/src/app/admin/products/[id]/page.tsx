"use client";

import { ProductDetailsScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseProductDetailsPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <ProductDetailsScreen
          enterpriseFilterId={enterpriseId}
          listHref="/admin/products"
          editHrefBase="/admin/products"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
