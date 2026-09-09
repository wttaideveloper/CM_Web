import { NextRequest } from "next/server";

import { invalidTrainingConfigurationIdResponse, isTrainingConfigurationId, proxyTrainingFormConfigurationGet } from "../../../_lib";

type RouteContext = { params: Promise<{ configurationId: string; versionId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { configurationId, versionId } = await context.params;
  return isTrainingConfigurationId(configurationId) && isTrainingConfigurationId(versionId)
    ? proxyTrainingFormConfigurationGet(`/api/v1/admin/training-form-configurations/${configurationId}/versions/${versionId}`)
    : invalidTrainingConfigurationIdResponse();
}
