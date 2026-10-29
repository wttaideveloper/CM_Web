import { NextRequest, NextResponse } from "next/server";

import { proxyEventTypesRequest } from "./_lib";

export function GET(request: NextRequest): Promise<NextResponse> {
  return proxyEventTypesRequest(request);
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return proxyEventTypesRequest(request);
}
