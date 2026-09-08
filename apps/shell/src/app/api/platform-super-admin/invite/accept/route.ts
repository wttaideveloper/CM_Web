import { NextRequest, NextResponse } from "next/server";

import { acceptSuperAdminInvite } from "@/lib/super-admin-invites";

type InviteAcceptRequest = { token?: unknown; email?: unknown; password?: unknown };

/** Accepts a Super Admin invitation through the Shell server without creating browser-accessible tokens. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: InviteAcceptRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "A valid invitation acceptance request is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!token || token.length > 4096 || !email || !password) {
    return NextResponse.json({ detail: "Invitation token, email, and password are required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const result = await acceptSuperAdminInvite({ token, email, password });
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
