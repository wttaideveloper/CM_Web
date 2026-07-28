"use client";

import { EditServicePage } from "@/app/services/[id]/edit/page";
import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";

export default function AdminEditServicePage() {
  return <CurrentEnterpriseGuard>{({ enterpriseId }) => (
    <EditServicePage enterpriseFilterId={enterpriseId} listHref="/admin/services" detailHrefBase="/admin/services" />
  )}</CurrentEnterpriseGuard>;
}
