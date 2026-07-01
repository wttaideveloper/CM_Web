"use client";

import { ProductsPage } from "@/app/products/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminProductsPage() {
  return (
    <ProductsPage
      enterpriseFilterId={CURRENT_ENTERPRISE.id}
      enterpriseName={CURRENT_ENTERPRISE.name}
      createHref="/admin/products/create"
      detailHrefBase="/admin/products"
      editHrefBase="/admin/products"
    />
  );
}
