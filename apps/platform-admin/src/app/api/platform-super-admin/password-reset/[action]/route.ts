import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

type PasswordResetAction = "forgot-password" | "verify-reset-code" | "reset-password";
type PasswordResetPayload = { email?: unknown; otp?: unknown; password?: unknown };
type RouteContext = { params: Promise<{ action: string }> };

const upstreamPaths: Record<PasswordResetAction, string> = {
  "forgot-password": "/auth/forgot-password",
  "verify-reset-code": "/auth/verify-reset-code",
  "reset-password": "/auth/reset-password",
};

function badRequest(detail: string): NextResponse {
  return NextResponse.json({ detail }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

/** Proxies the documented Super Admin password-reset operations without exposing bearer tokens. */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { action: requestedAction } = await context.params;
  if (!Object.prototype.hasOwnProperty.call(upstreamPaths, requestedAction)) {
    return NextResponse.json({ detail: "Unknown password reset action." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const action = requestedAction as PasswordResetAction;

  let payload: PasswordResetPayload;
  try {
    payload = await request.json();
  } catch {
    return badRequest("A valid password reset request is required.");
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const otp = typeof payload.otp === "string" ? payload.otp.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email) return badRequest("Email is required.");
  if (action === "verify-reset-code" && !/^\d{6}$/.test(otp)) {
    return badRequest("A six-digit verification code is required.");
  }
  if (action === "reset-password" && (!/^\d{6}$/.test(otp) || password.length < 8)) {
    return badRequest("A six-digit verification code and a password of at least eight characters are required.");
  }

  const resetPayload = action === "forgot-password"
    ? { email }
    : action === "verify-reset-code"
      ? { email, otp }
      : { email, otp, password };

  try {
    return superAdminJsonResponse(await requestSuperAdminJson(upstreamPaths[action], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resetPayload),
    }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
