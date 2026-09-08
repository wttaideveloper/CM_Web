import { NextRequest, NextResponse } from "next/server";

import { invalidEventIdResponse, isEventId, proxyPlatformEventMutation } from "../../_lib";

type RouteContext = { params: Promise<{ eventId: string }> };

/** Forwards the existing Event status transition request through the Platform BFF. */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { eventId } = await context.params;
  return isEventId(eventId)
    ? proxyPlatformEventMutation(request, `/api/v1/events/${eventId}/status`)
    : invalidEventIdResponse();
}
