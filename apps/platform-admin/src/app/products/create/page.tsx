import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformProductCreateWithEnterpriseData } from "@/components/PlatformEnterpriseDataClients";

export default function PlatformCreateProductPage() {
  return (
    <PlatformAdminShell>
      <PlatformProductCreateWithEnterpriseData />
    </PlatformAdminShell>
  );
}
