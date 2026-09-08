import { NextRequest, NextResponse } from "next/server";

import { proxyPlatformEventGet } from "./_lib";

const supportedCollectionParameters = new Set(["status", "page", "page_size", "search"]);

/** Lists Platform Events, forwarding only the collection filters used by Platform Event screens. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of request.nextUrl.searchParams) {
    if (supportedCollectionParameters.has(key)) query.append(key, value);
  }

  return proxyPlatformEventGet("/api/v1/events/", query);
}
