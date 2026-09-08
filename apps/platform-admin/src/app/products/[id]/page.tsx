import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformProductDetailsWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformProductDetailsPage() {
  return (
    <PlatformAdminShell>
      <PlatformProductDetailsWithEnterpriseData />
    </PlatformAdminShell>
  );
}
