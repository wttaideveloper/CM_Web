import { getShellAppOrigin } from "@ihp/auth";
import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

type InvitePayload = { email?: unknown; fullName?: unknown };

function approvedShellOrigin(): string | null {
  const origin = getShellAppOrigin();
  if (!origin) return null;

  try {
    const url = new URL(origin);
    if (url.origin !== origin || url.username || url.password) return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Invites a Super Admin while deriving the approved Shell origin entirely on the server. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const frontendOrigin = approvedShellOrigin();
  if (!frontendOrigin) {
    return NextResponse.json(
      { detail: "Shell invitation origin is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: InvitePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "A valid invitation request is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const fullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  if (!email || !fullName) {
    return NextResponse.json(
      { detail: "Full name and email are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    return superAdminJsonResponse(
      await requestSuperAdminJson("/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, frontendOrigin }),
      }),
    );
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
