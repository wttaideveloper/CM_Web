import { NextRequest } from "next/server";

import {
  invalidProgramConfigurationIdResponse,
  isProgramConfigurationId,
  proxyProgramFormConfigurationGet,
  proxyProgramFormConfigurationMutation,
} from "../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

async function pathFor(context: RouteContext): Promise<string | null> {
  const { configurationId } = await context.params;
  return isProgramConfigurationId(configurationId)
    ? `/api/v1/admin/program-form-configurations/${configurationId}`
    : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyProgramFormConfigurationGet(path) : invalidProgramConfigurationIdResponse();
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyProgramFormConfigurationMutation(request, path) : invalidProgramConfigurationIdResponse();
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyProgramFormConfigurationMutation(request, path) : invalidProgramConfigurationIdResponse();
}

