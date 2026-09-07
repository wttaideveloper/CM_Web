import PlatformAdminShell from "@/components/PlatformAdminShell";
import { FormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default async function PlatformFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformAdminShell><FormConfigurationEditorScreen id={id} mode="view" /></PlatformAdminShell>;
}
