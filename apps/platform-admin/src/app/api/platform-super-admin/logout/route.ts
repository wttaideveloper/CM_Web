import {
  clearSuperAdminSessionCookie,
  revokeSuperAdminSession,
} from "@/lib/super-admin-server-client";
import { NextResponse } from "next/server";

/** Revokes the dedicated session when possible and always removes the local HttpOnly bridge credential. */
export async function POST(): Promise<NextResponse> {
  const { revocationConfirmed, upstreamStatus } = await revokeSuperAdminSession();
  if (!revocationConfirmed) {
    console.error("[Super Admin logout] Upstream refresh-token revocation was not confirmed.", { upstreamStatus });
  }
  const response = revocationConfirmed
    ? NextResponse.json({ loggedOut: true }, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ detail: "Server-side logout could not be confirmed." }, { status: upstreamStatus ?? 502, headers: { "Cache-Control": "no-store" } });
  return clearSuperAdminSessionCookie(response);
}
