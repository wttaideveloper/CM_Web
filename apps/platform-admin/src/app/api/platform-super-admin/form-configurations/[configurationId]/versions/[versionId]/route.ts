import { NextRequest } from "next/server";

import { invalidConfigurationIdResponse, isConfigurationId, proxyFormConfigurationGet } from "../../../_lib";

type RouteContext = { params: Promise<{ configurationId: string; versionId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { configurationId, versionId } = await context.params;
  return isConfigurationId(configurationId) && isConfigurationId(versionId)
    ? proxyFormConfigurationGet(`/api/v1/admin/event-form-configurations/${configurationId}/versions/${versionId}`)
    : invalidConfigurationIdResponse();
}
