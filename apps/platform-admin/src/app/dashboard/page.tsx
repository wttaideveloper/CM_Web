import PlatformAdminShell from "@/components/PlatformAdminShell";

import { PlatformDashboardClient } from "./PlatformDashboardClient";

export default function PlatformDashboardPage() {
  return (
    <PlatformAdminShell>
      <PlatformDashboardClient />
    </PlatformAdminShell>
  );
}
