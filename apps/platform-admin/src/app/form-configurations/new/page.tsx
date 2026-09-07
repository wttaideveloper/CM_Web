import PlatformAdminShell from "@/components/PlatformAdminShell";
import { FormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default function NewPlatformFormConfigurationPage() {
  return <PlatformAdminShell><FormConfigurationEditorScreen mode="create" /></PlatformAdminShell>;
}
