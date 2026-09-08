import { NextRequest, NextResponse } from "next/server";

import { proxyEventCategoryRequest } from "./_lib";

/** Lists and creates Marketplace Event taxonomy entries through the Super Admin BFF. */
export function GET(request: NextRequest): Promise<NextResponse> {
  return proxyEventCategoryRequest(request);
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return proxyEventCategoryRequest(request);
}
