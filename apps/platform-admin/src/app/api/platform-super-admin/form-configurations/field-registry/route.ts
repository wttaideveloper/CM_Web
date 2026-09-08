import { proxyFormConfigurationGet } from "../_lib";

export async function GET() {
  return proxyFormConfigurationGet("/api/v1/admin/event-form-configurations/field-registry");
}
