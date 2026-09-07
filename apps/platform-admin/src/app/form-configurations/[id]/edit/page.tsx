import PlatformAdminShell from "@/components/PlatformAdminShell";
import { FormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default async function EditPlatformFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformAdminShell><FormConfigurationEditorScreen id={id} mode="edit" /></PlatformAdminShell>;
}
