"use client";

import { ServiceCreatePage } from "@/app/services/create/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminCreateServicePage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => (
    <ServiceCreatePage mode="enterprise-admin" redirectTo="/admin/services" enterpriseId={enterpriseId} enterpriseName={enterpriseName} />
  )}</CurrentEnterpriseGuard>;
}
