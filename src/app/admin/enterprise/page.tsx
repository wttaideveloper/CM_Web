"use client";

import { EnterpriseDetailsPage } from "@/app/enterprises/[id]/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminEnterprisePage() {
  return (
    <EnterpriseDetailsPage
      enterpriseId={CURRENT_ENTERPRISE.id}
      editHref="/admin/enterprise/edit"
      productCreateHref="/admin/products/create"
      serviceCreateHref="/admin/services/create"
      allowEnterpriseSelector={false}
      emptyValue="—"
    />
  );
}
