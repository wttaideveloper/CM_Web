import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformServiceCreateWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformCreateServicePage() {
  return (
    <PlatformAdminShell>
      <PlatformServiceCreateWithEnterpriseData />
    </PlatformAdminShell>
  );
}
