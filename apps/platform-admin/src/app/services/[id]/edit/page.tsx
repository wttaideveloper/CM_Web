import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformServiceEditWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformEditServicePage() {
  return (
    <PlatformAdminShell>
      <PlatformServiceEditWithEnterpriseData />
    </PlatformAdminShell>
  );
}
