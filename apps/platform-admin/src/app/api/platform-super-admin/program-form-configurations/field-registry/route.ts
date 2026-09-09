import { proxyProgramFormConfigurationGet } from "../_lib";

export async function GET() {
  return proxyProgramFormConfigurationGet("/api/v1/admin/program-form-configurations/field-registry");
}


