import { NextRequest } from "next/server";

import { proxyCourseFormConfigurationGet, proxyCourseFormConfigurationMutation } from "./_lib";

const collectionPath = "/api/v1/admin/course-form-configurations/";

export async function GET() {
  return proxyCourseFormConfigurationGet(collectionPath);
}

export async function POST(request: NextRequest) {
  return proxyCourseFormConfigurationMutation(request, collectionPath);
}

