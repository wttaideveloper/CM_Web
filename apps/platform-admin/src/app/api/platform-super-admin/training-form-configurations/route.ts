import { NextRequest } from "next/server";

import { proxyTrainingFormConfigurationGet, proxyTrainingFormConfigurationMutation } from "./_lib";

const collectionPath = "/api/v1/admin/training-form-configurations/";

export async function GET() {
  return proxyTrainingFormConfigurationGet(collectionPath);
}

export async function POST(request: NextRequest) {
  return proxyTrainingFormConfigurationMutation(request, collectionPath);
}
