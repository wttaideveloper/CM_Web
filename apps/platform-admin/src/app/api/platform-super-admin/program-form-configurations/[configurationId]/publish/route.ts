import { NextRequest } from "next/server";

import { invalidProgramConfigurationIdResponse, isProgramConfigurationId, proxyProgramFormConfigurationMutation } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isProgramConfigurationId(configurationId)
    ? proxyProgramFormConfigurationMutation(request, `/api/v1/admin/program-form-configurations/${configurationId}/publish`)
    : invalidProgramConfigurationIdResponse();
}

