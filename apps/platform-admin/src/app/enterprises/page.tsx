import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformEnterprisesManagementScreen } from "@ihp/platform-enterprises";

export default function PlatformEnterprisesPage() {
  return (
    <PlatformAdminShell>
      <PlatformEnterprisesManagementScreen />
    </PlatformAdminShell>
  );
}
