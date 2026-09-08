import { NextRequest } from "next/server";

import { invalidConfigurationIdResponse, isConfigurationId, proxyFormConfigurationMutation } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isConfigurationId(configurationId)
    ? proxyFormConfigurationMutation(request, `/api/v1/events/form-configuration/admin/${configurationId}/retire`)
    : invalidConfigurationIdResponse();
}
