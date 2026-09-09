import PlatformAdminShell from "@/components/PlatformAdminShell";
import { ProgramFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default async function EditPlatformProgramFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformAdminShell><ProgramFormConfigurationEditorScreen id={id} mode="edit" /></PlatformAdminShell>;
}

