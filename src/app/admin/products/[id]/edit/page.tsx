"use client";

import { EditProductPage } from "@/app/products/[id]/edit/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminEditProductPage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId }) => (
    <EditProductPage enterpriseFilterId={enterpriseId} listHref="/admin/products" detailHrefBase="/admin/products" />
  )}</CurrentEnterpriseGuard>;
}
