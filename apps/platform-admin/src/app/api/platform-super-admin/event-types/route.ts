import { NextResponse } from "next/server";

import { proxyEventTypesRequest } from "./_lib";

export function GET(): Promise<NextResponse> {
  return proxyEventTypesRequest();
}
