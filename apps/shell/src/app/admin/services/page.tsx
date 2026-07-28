"use client";

import { ServicesPage } from "@/app/services/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminServicesPage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => (
    <ServicesPage enterpriseFilterId={enterpriseId} enterpriseName={enterpriseName} createHref="/admin/services/create" detailHrefBase="/admin/services" editHrefBase="/admin/services" />
  )}</CurrentEnterpriseGuard>;
}
