import PlatformAdminShell from "@/components/PlatformAdminShell";
import { CourseFormConfigurationEditorScreen } from "@ihp/platform-form-configurations";

export default async function EditPlatformCourseFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformAdminShell><CourseFormConfigurationEditorScreen id={id} mode="edit" /></PlatformAdminShell>;
}

