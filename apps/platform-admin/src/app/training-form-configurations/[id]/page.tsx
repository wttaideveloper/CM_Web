import PlatformAdminShell from "@/components/PlatformAdminShell";
import { TrainingFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default async function PlatformTrainingFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformAdminShell><TrainingFormConfigurationEditorScreen id={id} mode="view" /></PlatformAdminShell>;
}
