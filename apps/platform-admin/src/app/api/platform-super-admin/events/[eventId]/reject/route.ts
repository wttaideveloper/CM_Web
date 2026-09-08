import { NextRequest, NextResponse } from "next/server";

import { invalidEventIdResponse, isEventId, proxyPlatformEventMutation } from "../../_lib";

type RouteContext = { params: Promise<{ eventId: string }> };

/** Forwards the existing administrative Event rejection request through the Platform BFF. */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { eventId } = await context.params;
  return isEventId(eventId)
    ? proxyPlatformEventMutation(request, `/api/v1/admin/events/${eventId}/reject`)
    : invalidEventIdResponse();
}
