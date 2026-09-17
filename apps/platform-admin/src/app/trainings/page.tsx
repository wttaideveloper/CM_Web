import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformTrainingAuthGate from "@/components/PlatformTrainingAuthGate";
import { PlatformTrainingsScreen } from "@ihp/platform-marketplace-static";

export default function PlatformTrainingsPage() {
  return (
    <PlatformAdminShell>
      <PlatformTrainingAuthGate>
        <PlatformTrainingsScreen />
      </PlatformTrainingAuthGate>
    </PlatformAdminShell>
  );
}
