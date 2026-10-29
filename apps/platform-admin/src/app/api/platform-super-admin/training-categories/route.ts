import { NextRequest, NextResponse } from "next/server";

import { proxyTrainingCategoryRequest } from "./_lib";

/** Lists Training taxonomy entries through the authenticated Super Admin BFF. */
export function GET(request: NextRequest): Promise<NextResponse> {
  return proxyTrainingCategoryRequest(request);
}

/** Creates a Training category or subcategory through the authenticated Super Admin BFF. */
export function POST(request: NextRequest): Promise<NextResponse> {
  return proxyTrainingCategoryRequest(request);
}
