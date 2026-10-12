import { NextRequest } from "next/server";

import { proxyPlatformReviewsRequest } from "../_lib";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  return proxyPlatformReviewsRequest(request, (await context.params).path);
}

export const GET = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
