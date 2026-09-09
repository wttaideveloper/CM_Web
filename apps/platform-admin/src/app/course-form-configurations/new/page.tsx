import PlatformAdminShell from "@/components/PlatformAdminShell";
import { CourseFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default function NewPlatformCourseFormConfigurationPage() {
  return <PlatformAdminShell><CourseFormConfigurationEditorScreen mode="create" /></PlatformAdminShell>;
}

