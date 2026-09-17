import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformTrainingAuthGate from "@/components/PlatformTrainingAuthGate";
import { TrainingFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default async function EditPlatformTrainingFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformAdminShell><PlatformTrainingAuthGate><TrainingFormConfigurationEditorScreen id={id} mode="edit" /></PlatformTrainingAuthGate></PlatformAdminShell>;
}
