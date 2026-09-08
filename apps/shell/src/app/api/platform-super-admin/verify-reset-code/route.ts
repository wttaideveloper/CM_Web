import { NextRequest, NextResponse } from "next/server";

import { verifySuperAdminPasswordResetCode } from "@/lib/super-admin-invites";

type VerifyResetCodeRequest = { email?: unknown; otp?: unknown };

/** Verifies a six-digit Super Admin reset code through the same-origin Shell boundary. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: VerifyResetCodeRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "A valid verification request is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const otp = typeof payload.otp === "string" ? payload.otp.trim() : "";
  if (!email || !/^\d{6}$/.test(otp)) return NextResponse.json({ detail: "Email and a six-digit verification code are required." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const result = await verifySuperAdminPasswordResetCode(email, otp);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
