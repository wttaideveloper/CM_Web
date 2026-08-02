import PlatformAdminShell from "@/components/PlatformAdminShell";
import { ServicesListScreen } from "@ihp/services";

export default function PlatformServicesPage() {
  return (
    <PlatformAdminShell>
      <ServicesListScreen />
    </PlatformAdminShell>
  );
}
