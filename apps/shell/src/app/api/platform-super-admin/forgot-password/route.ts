import { NextRequest, NextResponse } from "next/server";

import { requestSuperAdminPasswordReset } from "@/lib/super-admin-invites";

type ForgotPasswordRequest = { email?: unknown };

/** Proxies the public dedicated Super Admin reset-email request without requiring a session. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: ForgotPasswordRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "A valid password reset request is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!email) return NextResponse.json({ detail: "Email is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const result = await requestSuperAdminPasswordReset(email);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
