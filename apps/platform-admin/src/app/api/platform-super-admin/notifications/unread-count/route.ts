import { getSuperAdminJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

export async function GET() {
  try { return superAdminJsonResponse(await getSuperAdminJson("/users/me/notifications/unread-count")); }
  catch (error) { return superAdminErrorResponse(error); }
}
