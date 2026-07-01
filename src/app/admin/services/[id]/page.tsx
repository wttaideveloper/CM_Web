"use client";

import { ServiceDetailsPage } from "@/app/services/[id]/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminServiceDetailsPage() {
  return (
    <ServiceDetailsPage
      enterpriseFilterId={CURRENT_ENTERPRISE.id}
      listHref="/admin/services"
      editHrefBase="/admin/services"
    />
  );
}
