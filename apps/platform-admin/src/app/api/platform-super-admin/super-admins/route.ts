import {
  requestSuperAdminJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

/** Proxies the dedicated Super Admin collection through the server-only session boundary. */
export async function GET() {
  try {
    return superAdminJsonResponse(await requestSuperAdminJson("/super-admins"));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
