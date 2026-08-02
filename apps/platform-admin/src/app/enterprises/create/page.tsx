"use client";

import PlatformAdminShell from "@/components/PlatformAdminShell";
import { EnterpriseCreateScreen } from "@ihp/enterprises";
import { loadEnterpriseTenantOptions } from "@ihp/platform-enterprises";

export default function PlatformCreateEnterprisePage() {
  return (
    <PlatformAdminShell>
      <EnterpriseCreateScreen tenantOptionsLoader={loadEnterpriseTenantOptions} />
    </PlatformAdminShell>
  );
}
