"use client";

import { useTenant } from "@ihp/enterprise-runtime";
import { ProductCreateScreen } from "@ihp/products";

import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseCreateProductPage() {
  const { tenantId } = useTenant();

  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <ProductCreateScreen
          mode="enterprise-admin"
          redirectTo="/admin/products"
          enterpriseId={enterpriseId}
          enterpriseName={enterpriseName}
          tenantId={tenantId ?? undefined}
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
