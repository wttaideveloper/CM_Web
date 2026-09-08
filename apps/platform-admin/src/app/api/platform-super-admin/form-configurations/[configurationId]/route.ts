import { NextRequest } from "next/server";

import {
  invalidConfigurationIdResponse,
  isConfigurationId,
  proxyFormConfigurationGet,
  proxyFormConfigurationMutation,
} from "../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

async function pathFor(context: RouteContext): Promise<string | null> {
  const { configurationId } = await context.params;
  return isConfigurationId(configurationId)
    ? `/api/v1/admin/event-form-configurations/${configurationId}`
    : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyFormConfigurationGet(path) : invalidConfigurationIdResponse();
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyFormConfigurationMutation(request, path) : invalidConfigurationIdResponse();
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyFormConfigurationMutation(request, path) : invalidConfigurationIdResponse();
}
