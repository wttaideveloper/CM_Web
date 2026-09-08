import { NextRequest, NextResponse } from "next/server";

import { invalidEventIdResponse, isEventId, proxyPlatformEventGet } from "../_lib";

type RouteContext = { params: Promise<{ eventId: string }> };

/** Retrieves one Event dossier for Platform approval review. */
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { eventId } = await context.params;
  return isEventId(eventId)
    ? proxyPlatformEventGet(`/api/v1/events/${eventId}`)
    : invalidEventIdResponse();
}
