import { getSuperAdminWorkflowJson, superAdminJsonResponse, superAdminWorkflowErrorResponse } from "@/lib/super-admin-server-client";

export async function PUT() {
  try { const result = await getSuperAdminWorkflowJson("/users/me/notifications/read-all", { method: "PUT" }); return result.status >= 200 && result.status < 300 ? superAdminJsonResponse(result) : superAdminWorkflowErrorResponse(result); }
  catch (error) { return superAdminWorkflowErrorResponse(error); }
}
