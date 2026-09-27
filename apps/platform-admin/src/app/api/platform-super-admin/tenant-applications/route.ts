import { requestSuperAdminJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status");
    return superAdminJsonResponse(await requestSuperAdminJson(`/tenant-applications${status ? `?status=${encodeURIComponent(status)}` : ""}`));
  } catch (error) { return superAdminErrorResponse(error); }
}
