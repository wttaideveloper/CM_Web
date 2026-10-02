import { getSuperAdminJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return superAdminJsonResponse(await getSuperAdminJson(`/users/me/notifications/${encodeURIComponent(id)}/read`)); }
  catch (error) { return superAdminErrorResponse(error); }
}
