import { NextRequest } from "next/server";

import {
  invalidTrainingConfigurationIdResponse,
  isTrainingConfigurationId,
  proxyTrainingFormConfigurationGet,
  proxyTrainingFormConfigurationMutation,
} from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

async function pathFor(context: RouteContext): Promise<string | null> {
  const { configurationId } = await context.params;
  return isTrainingConfigurationId(configurationId)
    ? `/api/v1/admin/training-form-configurations/${configurationId}/assignments`
    : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyTrainingFormConfigurationGet(path) : invalidTrainingConfigurationIdResponse();
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyTrainingFormConfigurationMutation(request, path) : invalidTrainingConfigurationIdResponse();
}
