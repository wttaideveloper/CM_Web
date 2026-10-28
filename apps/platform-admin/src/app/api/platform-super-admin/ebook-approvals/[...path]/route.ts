import { NextRequest } from "next/server";

import { proxyEbookApproval } from "../_lib";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyEbookApproval(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyEbookApproval(request, path);
}
