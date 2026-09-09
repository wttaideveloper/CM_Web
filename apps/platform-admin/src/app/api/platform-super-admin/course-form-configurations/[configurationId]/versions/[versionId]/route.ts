import { NextRequest } from "next/server";

import { invalidCourseConfigurationIdResponse, isCourseConfigurationId, proxyCourseFormConfigurationGet } from "../../../_lib";

type RouteContext = { params: Promise<{ configurationId: string; versionId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { configurationId, versionId } = await context.params;
  return isCourseConfigurationId(configurationId) && isCourseConfigurationId(versionId)
    ? proxyCourseFormConfigurationGet(`/api/v1/admin/course-form-configurations/${configurationId}/versions/${versionId}`)
    : invalidCourseConfigurationIdResponse();
}

