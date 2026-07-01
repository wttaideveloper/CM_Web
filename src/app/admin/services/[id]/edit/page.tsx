"use client";

import { EditServicePage } from "@/app/services/[id]/edit/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminEditServicePage() {
  return (
    <EditServicePage
      enterpriseFilterId={CURRENT_ENTERPRISE.id}
      listHref="/admin/services"
      detailHrefBase="/admin/services"
    />
  );
}
