import { NextRequest } from "next/server";

import {
  invalidCourseConfigurationIdResponse,
  isCourseConfigurationId,
  proxyCourseFormConfigurationGet,
  proxyCourseFormConfigurationMutation,
} from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

async function pathFor(context: RouteContext): Promise<string | null> {
  const { configurationId } = await context.params;
  return isCourseConfigurationId(configurationId)
    ? `/api/v1/admin/course-form-configurations/${configurationId}/assignments`
    : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyCourseFormConfigurationGet(path) : invalidCourseConfigurationIdResponse();
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const path = await pathFor(context);
  return path ? proxyCourseFormConfigurationMutation(request, path) : invalidCourseConfigurationIdResponse();
}

