import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformTrainingAuthGate from "@/components/PlatformTrainingAuthGate";
import { TrainingFormConfigurationsScreen } from "@ihp/platform-form-configurations";

export default function PlatformTrainingFormConfigurationsPage() {
  return <PlatformAdminShell><PlatformTrainingAuthGate><TrainingFormConfigurationsScreen /></PlatformTrainingAuthGate></PlatformAdminShell>;
}
