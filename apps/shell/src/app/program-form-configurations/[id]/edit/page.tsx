import { redirect } from "next/navigation";

export default async function ShellEditProgramFormConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`http://localhost:3002/program-form-configurations/${id}/edit`);
}
