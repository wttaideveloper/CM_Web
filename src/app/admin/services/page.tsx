"use client";

import { ServicesPage } from "@/app/services/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminServicesPage() {
  return (
    <ServicesPage
      enterpriseFilterId={CURRENT_ENTERPRISE.id}
      enterpriseName={CURRENT_ENTERPRISE.name}
      createHref="/admin/services/create"
      detailHrefBase="/admin/services"
      editHrefBase="/admin/services"
    />
  );
}
