import { NextRequest, NextResponse } from "next/server";

import { invalidEventIdResponse, isEventId, proxyPlatformEventGet } from "../../_lib";

type RouteContext = { params: Promise<{ eventId: string }> };

/** Retrieves the existing administrative Event audit history through the Platform BFF. */
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { eventId } = await context.params;
  return isEventId(eventId)
    ? proxyPlatformEventGet(`/api/v1/admin/event-audits/${eventId}`)
    : invalidEventIdResponse();
}
