import {
  getSuperAdminJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

/** Proxies the dedicated Super Admin tenant list through the server-only session boundary. */
export async function GET() {
  try {
    return superAdminJsonResponse(await getSuperAdminJson("/tenants"));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
