import {
  getSuperAdminJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

/** Proxies only Enterprise-module tenants through the dedicated Super Admin session boundary. */
export async function GET() {
  try {
    return superAdminJsonResponse(await getSuperAdminJson("/tenants/enterprise"));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
