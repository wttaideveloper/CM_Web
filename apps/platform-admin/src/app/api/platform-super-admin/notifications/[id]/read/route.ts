import { getSuperAdminWorkflowJson, superAdminJsonResponse, superAdminWorkflowErrorResponse } from "@/lib/super-admin-server-client";

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const result = await getSuperAdminWorkflowJson(`/users/me/notifications/${encodeURIComponent(id)}/read`); return result.status >= 200 && result.status < 300 ? superAdminJsonResponse(result) : superAdminWorkflowErrorResponse(result); }
  catch (error) { return superAdminWorkflowErrorResponse(error); }
}
