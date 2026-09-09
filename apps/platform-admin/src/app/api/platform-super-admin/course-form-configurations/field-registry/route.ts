import { proxyCourseFormConfigurationGet } from "../_lib";

export async function GET() {
  return proxyCourseFormConfigurationGet("/api/v1/admin/course-form-configurations/field-registry");
}

