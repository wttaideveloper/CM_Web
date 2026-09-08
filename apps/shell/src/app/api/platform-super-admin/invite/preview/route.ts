import { NextRequest, NextResponse } from "next/server";

import { previewSuperAdminInvite } from "@/lib/super-admin-invites";

/** Proxies a public invitation preview without exposing any authenticated credential. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token || token.length > 4096) {
    return NextResponse.json({ detail: "A valid invitation token is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const result = await previewSuperAdminInvite(token);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
