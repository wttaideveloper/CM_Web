"use client";

import { EditProductPage } from "@/app/products/[id]/edit/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminEditProductPage() {
  return (
    <EditProductPage
      enterpriseFilterId={CURRENT_ENTERPRISE.id}
      listHref="/admin/products"
      detailHrefBase="/admin/products"
    />
  );
}
