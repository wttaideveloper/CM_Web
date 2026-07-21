"use client";

import { ProductCreatePage } from "@/app/products/create/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminCreateProductPage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => (
    <ProductCreatePage mode="enterprise-admin" redirectTo="/admin/products" enterpriseId={enterpriseId} enterpriseName={enterpriseName} />
  )}</CurrentEnterpriseGuard>;
}
