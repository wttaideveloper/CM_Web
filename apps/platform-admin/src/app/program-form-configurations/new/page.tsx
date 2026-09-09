import PlatformAdminShell from "@/components/PlatformAdminShell";
import { ProgramFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default function NewPlatformProgramFormConfigurationPage() {
  return <PlatformAdminShell><ProgramFormConfigurationEditorScreen mode="create" /></PlatformAdminShell>;
}

