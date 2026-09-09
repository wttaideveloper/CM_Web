import PlatformAdminShell from "@/components/PlatformAdminShell";
import { TrainingFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default function NewPlatformTrainingFormConfigurationPage() {
  return <PlatformAdminShell><TrainingFormConfigurationEditorScreen mode="create" /></PlatformAdminShell>;
}
