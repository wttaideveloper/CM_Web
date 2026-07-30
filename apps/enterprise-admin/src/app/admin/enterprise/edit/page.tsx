"use client";

import { EnterpriseEditScreen } from "@ihp/enterprises";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseEditPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <EnterpriseEditScreen
          enterpriseId={enterpriseId}
          successRedirect="/admin/enterprise"
          backHref="/admin/enterprise"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
