import { NextRequest } from "next/server";

import { proxyFormConfigurationGet, proxyFormConfigurationMutation } from "./_lib";

const collectionPath = "/api/v1/admin/event-form-configurations/";

export async function GET() {
  return proxyFormConfigurationGet(collectionPath);
}

export async function POST(request: NextRequest) {
  return proxyFormConfigurationMutation(request, collectionPath);
}
