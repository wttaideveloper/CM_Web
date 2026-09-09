import PlatformAdminShell from "@/components/PlatformAdminShell";
import { TrainingFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default async function EditPlatformTrainingFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformAdminShell><TrainingFormConfigurationEditorScreen id={id} mode="edit" /></PlatformAdminShell>;
}
