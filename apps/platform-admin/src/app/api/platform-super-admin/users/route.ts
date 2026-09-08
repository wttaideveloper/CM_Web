import {
  getSuperAdminJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { NextResponse } from "next/server";

/** Proxies the dedicated Super Admin global-user list for temporary runtime contract inspection. */
export async function GET(request: Request) {
  const includeDeleted = new URL(request.url).searchParams.get("includeDeleted");
  if (includeDeleted !== null && includeDeleted !== "true" && includeDeleted !== "false") {
    return NextResponse.json(
      { detail: "includeDeleted must be true or false." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const query = includeDeleted === null ? "" : `?includeDeleted=${includeDeleted}`;
  try {
    return superAdminJsonResponse(await getSuperAdminJson(`/users${query}`));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
