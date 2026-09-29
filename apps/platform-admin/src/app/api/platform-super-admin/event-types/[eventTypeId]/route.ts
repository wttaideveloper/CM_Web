import { NextRequest, NextResponse } from "next/server";

import { proxyEventTypesRequest } from "../_lib";

export async function GET(request: NextRequest, context: { params: Promise<{ eventTypeId: string }> }): Promise<NextResponse> {
  return proxyEventTypesRequest(request, (await context.params).eventTypeId);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ eventTypeId: string }> }): Promise<NextResponse> {
  return proxyEventTypesRequest(request, (await context.params).eventTypeId);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ eventTypeId: string }> }): Promise<NextResponse> {
  return proxyEventTypesRequest(request, (await context.params).eventTypeId);
}
