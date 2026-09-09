import { NextRequest } from "next/server";

import { invalidTrainingConfigurationIdResponse, isTrainingConfigurationId, proxyTrainingFormConfigurationMutation } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isTrainingConfigurationId(configurationId)
    ? proxyTrainingFormConfigurationMutation(request, `/api/v1/admin/training-form-configurations/${configurationId}/activate`)
    : invalidTrainingConfigurationIdResponse();
}
