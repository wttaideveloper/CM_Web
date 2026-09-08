import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformAttributesWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformAttributesPage() {
  return (
    <PlatformAdminShell>
      <PlatformAttributesWithEnterpriseData />
    </PlatformAdminShell>
  );
}
