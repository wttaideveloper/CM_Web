import type { ReactNode } from "react";

import EnterpriseAdminAuthGuard from "@/components/EnterpriseAdminAuthGuard";
import EnterpriseAdminShell from "@/components/EnterpriseAdminShell";

export default function EnterpriseAdminRouteLayout({ children }: { children: ReactNode }) {
  return (
    <EnterpriseAdminAuthGuard>
      <EnterpriseAdminShell>{children}</EnterpriseAdminShell>
    </EnterpriseAdminAuthGuard>
  );
}
