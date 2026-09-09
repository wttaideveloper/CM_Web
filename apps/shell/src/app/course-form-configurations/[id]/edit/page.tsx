import { redirect } from "next/navigation";

export default async function ShellEditCourseFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`http://localhost:3002/course-form-configurations/${id}/edit`);
}
