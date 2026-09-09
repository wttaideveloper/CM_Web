import { NextRequest } from "next/server";

import { invalidTrainingConfigurationIdResponse, isTrainingConfigurationId, proxyTrainingFormConfigurationGet } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isTrainingConfigurationId(configurationId)
    ? proxyTrainingFormConfigurationGet(`/api/v1/admin/training-form-configurations/${configurationId}/versions`)
    : invalidTrainingConfigurationIdResponse();
}
