"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import { useTenant } from "@/contexts/TenantContext";
import AppShell from "@/components/layout/AppShell";
import { ProductCreateScreen } from "@ihp/products";

export default function AdminCreateProductPage() {
  const { tenantId } = useTenant();

  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <AppShell>
          <ProductCreateScreen
            mode="enterprise-admin"
            redirectTo="/admin/products"
            enterpriseId={enterpriseId}
            enterpriseName={enterpriseName}
            tenantId={tenantId ?? undefined}
          />
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
