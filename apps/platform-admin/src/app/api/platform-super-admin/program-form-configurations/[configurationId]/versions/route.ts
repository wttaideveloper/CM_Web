import { NextRequest } from "next/server";

import { invalidProgramConfigurationIdResponse, isProgramConfigurationId, proxyProgramFormConfigurationGet } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isProgramConfigurationId(configurationId)
    ? proxyProgramFormConfigurationGet(`/api/v1/admin/program-form-configurations/${configurationId}/versions`)
    : invalidProgramConfigurationIdResponse();
}

