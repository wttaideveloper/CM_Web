import { NextRequest } from "next/server";

import { proxyWorkflowRequest } from "../../workflow-proxy";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  return proxyWorkflowRequest(request, "workflows", (await context.params).path);
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
