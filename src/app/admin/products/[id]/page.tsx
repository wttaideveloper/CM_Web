"use client";

import { ProductDetailsPage } from "@/app/products/[id]/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminProductDetailsPage() {
  return (
    <ProductDetailsPage
      enterpriseFilterId={CURRENT_ENTERPRISE.id}
      listHref="/admin/products"
      editHrefBase="/admin/products"
    />
  );
}
