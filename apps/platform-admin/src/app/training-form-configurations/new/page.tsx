import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformTrainingAuthGate from "@/components/PlatformTrainingAuthGate";
import { TrainingFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default function NewPlatformTrainingFormConfigurationPage() {
  return <PlatformAdminShell><PlatformTrainingAuthGate><TrainingFormConfigurationEditorScreen mode="create" /></PlatformTrainingAuthGate></PlatformAdminShell>;
}
