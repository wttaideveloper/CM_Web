import { getSuperAdminJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

export async function PUT() {
  try { return superAdminJsonResponse(await getSuperAdminJson("/users/me/notifications/read-all")); }
  catch (error) { return superAdminErrorResponse(error); }
}
