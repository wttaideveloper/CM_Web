"use client";

import { EditEnterprisePage } from "@/app/enterprises/[id]/edit/page";
import { CURRENT_ENTERPRISE } from "@/lib/current-enterprise";

export default function AdminEnterpriseEditPage() {
  return (
    <EditEnterprisePage
      enterpriseId={CURRENT_ENTERPRISE.id}
      successRedirect="/admin/enterprise"
      backHref="/admin/enterprise"
    />
  );
}
