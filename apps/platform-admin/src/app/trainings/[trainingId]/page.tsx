import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformTrainingAuthGate from "@/components/PlatformTrainingAuthGate";
import { TrainingDetailsScreen } from "@ihp/enterprise-trainings";

export default function PlatformTrainingDetailPage() {
  return (
    <PlatformAdminShell>
      <PlatformTrainingAuthGate>
        <TrainingDetailsScreen managementActions={false} />
      </PlatformTrainingAuthGate>
    </PlatformAdminShell>
  );
}
