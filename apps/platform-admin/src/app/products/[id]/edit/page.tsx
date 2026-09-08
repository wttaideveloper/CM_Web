import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformProductEditWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformEditProductPage() {
  return (
    <PlatformAdminShell>
      <PlatformProductEditWithEnterpriseData />
    </PlatformAdminShell>
  );
}
