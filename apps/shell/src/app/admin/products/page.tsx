"use client";

import { ProductsPage } from "@/app/products/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminProductsPage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => (
    <ProductsPage enterpriseFilterId={enterpriseId} enterpriseName={enterpriseName} createHref="/admin/products/create" detailHrefBase="/admin/products" editHrefBase="/admin/products" />
  )}</CurrentEnterpriseGuard>;
}
