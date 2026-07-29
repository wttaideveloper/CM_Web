"use client";

import AppShell from "@/components/layout/AppShell";
import { loadEnterpriseTenantOptions } from "@/adapters/enterprise-screen-loaders";
import { EnterpriseCreateScreen } from "@ihp/enterprises";

export default function CreateEnterprisePage() {
  return (
    <AppShell>
      <EnterpriseCreateScreen tenantOptionsLoader={loadEnterpriseTenantOptions} />
    </AppShell>
  );
}
