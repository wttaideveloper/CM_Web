import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformServiceDetailsWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformServiceDetailsPage() {
  return (
    <PlatformAdminShell>
      <PlatformServiceDetailsWithEnterpriseData />
    </PlatformAdminShell>
  );
}
