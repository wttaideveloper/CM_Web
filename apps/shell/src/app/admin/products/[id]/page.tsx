"use client";

import { ProductDetailsPage } from "@/app/products/[id]/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminProductDetailsPage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId }) => (
    <ProductDetailsPage enterpriseFilterId={enterpriseId} listHref="/admin/products" editHrefBase="/admin/products" />
  )}</CurrentEnterpriseGuard>;
}
