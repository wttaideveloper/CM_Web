import { NextRequest } from "next/server";

import { invalidCourseConfigurationIdResponse, isCourseConfigurationId, proxyCourseFormConfigurationMutation } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isCourseConfigurationId(configurationId)
    ? proxyCourseFormConfigurationMutation(request, `/api/v1/admin/course-form-configurations/${configurationId}/deactivate`)
    : invalidCourseConfigurationIdResponse();
}

