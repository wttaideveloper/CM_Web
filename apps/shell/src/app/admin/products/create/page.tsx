"use client";

import { ProductCreatePage } from "@/app/products/create/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import { useTenant } from "@/contexts/TenantContext";

export default function AdminCreateProductPage() {
  const { tenantId } = useTenant();

  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => (
    <ProductCreatePage
      mode="enterprise-admin"
      redirectTo="/admin/products"
      enterpriseId={enterpriseId}
      enterpriseName={enterpriseName}
      tenantId={tenantId ?? undefined}
    />
  )}</CurrentEnterpriseGuard>;
}
