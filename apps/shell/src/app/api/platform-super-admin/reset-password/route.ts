import { NextRequest, NextResponse } from "next/server";

import { resetSuperAdminPassword } from "@/lib/super-admin-invites";

type ResetPasswordRequest = { email?: unknown; password?: unknown; otp?: unknown };

/** Resets a verified Super Admin password without returning a session or credential to browser JavaScript. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: ResetPasswordRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "A valid password reset request is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const otp = typeof payload.otp === "string" ? payload.otp.trim() : "";
  if (!email || !password || !/^\d{6}$/.test(otp)) return NextResponse.json({ detail: "Email, password, and verified reset code are required." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const result = await resetSuperAdminPassword(email, password, otp);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
