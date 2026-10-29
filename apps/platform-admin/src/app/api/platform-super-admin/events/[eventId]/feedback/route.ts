import { NextRequest, NextResponse } from "next/server";

import { invalidEventIdResponse, isEventId, proxyPlatformEventGet } from "../../_lib";

type RouteContext = { params: Promise<{ eventId: string }> };

/** Returns mobile attendee feedback for a single Event to an authenticated Super Admin. */
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { eventId } = await context.params;
  return isEventId(eventId)
    ? proxyPlatformEventGet(`/api/v1/events/${eventId}/feedback`)
    : invalidEventIdResponse();
}
