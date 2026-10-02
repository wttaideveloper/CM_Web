import { getSuperAdminJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get("page") ?? "1";
    const pageSize = url.searchParams.get("page_size") ?? "20";
    return superAdminJsonResponse(await getSuperAdminJson(`/users/me/notifications?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`));
  } catch (error) { return superAdminErrorResponse(error); }
}
