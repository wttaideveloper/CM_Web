import { requestSuperAdminJson, isTenantUuid, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";
export async function GET(_: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  if (!isTenantUuid(applicationId)) return Response.json({ detail: "Invalid application ID." }, { status: 400 });
  try { return superAdminJsonResponse(await requestSuperAdminJson(`/tenant-applications/${applicationId}`)); } catch (error) { return superAdminErrorResponse(error); }
}
