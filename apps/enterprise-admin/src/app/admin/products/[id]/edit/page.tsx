"use client";

import { ProductEditScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseProductEditPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <ProductEditScreen
          enterpriseFilterId={enterpriseId}
          listHref="/admin/products"
          detailHrefBase="/admin/products"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
