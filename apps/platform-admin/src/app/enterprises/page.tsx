import PlatformAdminShell from "@/components/PlatformAdminShell";
import { EnterprisesListScreen } from "@ihp/enterprises";

export default function PlatformEnterprisesPage() {
  return (
    <PlatformAdminShell>
      <EnterprisesListScreen />
    </PlatformAdminShell>
  );
}
