"use client";

import { ServiceDetailsPage } from "@/app/services/[id]/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminServiceDetailsPage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId }) => (
    <ServiceDetailsPage enterpriseFilterId={enterpriseId} listHref="/admin/services" editHrefBase="/admin/services" />
  )}</CurrentEnterpriseGuard>;
}
