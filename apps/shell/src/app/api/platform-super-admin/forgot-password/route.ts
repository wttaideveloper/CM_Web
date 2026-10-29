import { NextRequest, NextResponse } from "next/server";

import { requestSuperAdminPasswordReset } from "@/lib/super-admin-invites";

type ForgotPasswordRequest = { email?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnregisteredAccountResponse(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const code = [value.code, value.error_code]
    .find((candidate): candidate is string => typeof candidate === "string")
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (code && ["account_not_found", "account_not_registered", "email_not_found", "email_not_registered", "id_not_registered", "user_not_found", "user_not_registered"].includes(code)) {
    return true;
  }

  const detail = [value.detail, value.message, value.error]
    .find((candidate): candidate is string => typeof candidate === "string")
    ?.trim()
    .toLowerCase();
  return Boolean(detail && /^(?:(?:the )?(?:user|account|email(?: address)?|id)(?: with (?:this )?email)? (?:is )?(?:not found|not registered|does not exist)|no (?:user|account) found(?: (?:with|for) (?:this )?email)?)(?:[.!](?:\s+.*)?)?$/i.test(detail));
}

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
  if (isUnregisteredAccountResponse(result.body)) {
    return NextResponse.json(
      {
        code: "id_not_registered",
        detail: "ID not registered. Please enter your registered email.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    (result.status >= 200 && result.status < 300) ||
    result.status === 400 ||
    result.status === 403 ||
    result.status === 404
  ) {
    return NextResponse.json(
      { message: "If the account is eligible, a verification code has been sent." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
