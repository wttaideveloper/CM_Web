import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformEnterpriseEditWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformEditEnterprisePage() {
  return (
    <PlatformAdminShell>
      <PlatformEnterpriseEditWithEnterpriseData />
    </PlatformAdminShell>
  );
}
