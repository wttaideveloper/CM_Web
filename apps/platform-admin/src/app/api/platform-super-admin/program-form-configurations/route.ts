import { NextRequest } from "next/server";

import { proxyProgramFormConfigurationGet, proxyProgramFormConfigurationMutation } from "./_lib";

const collectionPath = "/api/v1/admin/program-form-configurations/";

export async function GET() {
  return proxyProgramFormConfigurationGet(collectionPath);
}

export async function POST(request: NextRequest) {
  return proxyProgramFormConfigurationMutation(request, collectionPath);
}


