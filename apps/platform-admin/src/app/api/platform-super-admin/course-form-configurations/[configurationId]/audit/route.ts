import { NextRequest } from "next/server";

import { invalidCourseConfigurationIdResponse, isCourseConfigurationId, proxyCourseFormConfigurationGet } from "../../_lib";

type RouteContext = { params: Promise<{ configurationId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { configurationId } = await context.params;
  return isCourseConfigurationId(configurationId)
    ? proxyCourseFormConfigurationGet(`/api/v1/admin/course-form-configurations/${configurationId}/audit`)
    : invalidCourseConfigurationIdResponse();
}

