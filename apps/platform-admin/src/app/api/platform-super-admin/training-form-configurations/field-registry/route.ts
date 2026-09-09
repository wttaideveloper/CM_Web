import { proxyTrainingFormConfigurationGet } from "../_lib";

export async function GET() {
  return proxyTrainingFormConfigurationGet("/api/v1/admin/training-form-configurations/field-registry");
}
