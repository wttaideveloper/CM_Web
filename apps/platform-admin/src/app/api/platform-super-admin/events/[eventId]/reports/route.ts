import { NextRequest, NextResponse } from "next/server";

import { invalidEventIdResponse, isEventId, proxyPlatformEventGet } from "../../_lib";

type RouteContext = { params: Promise<{ eventId: string }> };

/** Returns the feedback-only report for a single Event to an authenticated Super Admin. */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { eventId } = await context.params;
  if (!isEventId(eventId)) return invalidEventIdResponse();
  const query = new URLSearchParams({ type: "feedback", format: "json" });
  return proxyPlatformEventGet(`/api/v1/events/${eventId}/reports`, query);
}
