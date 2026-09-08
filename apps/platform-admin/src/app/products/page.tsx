import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformProductsListWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformProductsPage() {
  return (
    <PlatformAdminShell>
      <PlatformProductsListWithEnterpriseData />
    </PlatformAdminShell>
  );
}
