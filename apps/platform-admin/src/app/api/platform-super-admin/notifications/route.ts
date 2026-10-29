import { getSuperAdminWorkflowJson, superAdminJsonResponse, superAdminWorkflowErrorResponse } from "@/lib/super-admin-server-client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get("page") ?? "1";
    const pageSize = url.searchParams.get("page_size") ?? "20";
    const result = await getSuperAdminWorkflowJson(`/users/me/notifications?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`);
    return result.status >= 200 && result.status < 300 ? superAdminJsonResponse(result) : superAdminWorkflowErrorResponse(result);
  } catch (error) { return superAdminWorkflowErrorResponse(error); }
}
