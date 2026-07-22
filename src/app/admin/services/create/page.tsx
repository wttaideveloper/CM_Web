"use client";

import { ServiceCreatePage } from "@/app/services/create/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import { useTenant } from "@/contexts/TenantContext";

export default function AdminCreateServicePage() {
  const { tenantId } = useTenant();

  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => (
    <ServiceCreatePage
      mode="enterprise-admin"
      redirectTo="/admin/services"
      enterpriseId={enterpriseId}
      enterpriseName={enterpriseName}
      tenantId={tenantId ?? undefined}
    />
  )}</CurrentEnterpriseGuard>;
}
