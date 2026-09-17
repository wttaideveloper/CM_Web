import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformTrainingAuthGate from "@/components/PlatformTrainingAuthGate";
import { PlatformApprovalScreen } from "@ihp/enterprise-trainings";

export default function PlatformApprovalPage() {
  return (
    <PlatformAdminShell>
      <PlatformTrainingAuthGate>
        <PlatformApprovalScreen />
      </PlatformTrainingAuthGate>
    </PlatformAdminShell>
  );
}
