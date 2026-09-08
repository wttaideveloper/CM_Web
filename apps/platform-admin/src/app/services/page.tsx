import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformServicesListWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformServicesPage() {
  return (
    <PlatformAdminShell>
      <PlatformServicesListWithEnterpriseData />
    </PlatformAdminShell>
  );
}
