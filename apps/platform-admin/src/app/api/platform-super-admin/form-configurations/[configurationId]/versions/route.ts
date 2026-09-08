import { NextRequest } from "next/server";

import { invalidConfigurationIdResponse, isConfigurationId, proxyFormConfigurationGet } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isConfigurationId(configurationId)
    ? proxyFormConfigurationGet(`/api/v1/admin/event-form-configurations/${configurationId}/versions`)
    : invalidConfigurationIdResponse();
}
