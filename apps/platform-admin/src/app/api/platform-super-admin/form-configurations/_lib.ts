import { NextRequest, NextResponse } from "next/server";

import {
  getSuperAdminUpstreamJson,
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;
const configurationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function marketplaceUrl(pathname: string): URL | null {
  if (!MARKETPLACE_API_BASE_URL) return null;

  try {
    const url = new URL(MARKETPLACE_API_BASE_URL);
    if (url.protocol !== "https:" || url.hostname !== "chat.wisdomtooth.tech") return null;
    url.pathname = pathname;
    url.search = "";
    return url;
  } catch {
    return null;
  }
}

export function isConfigurationId(value: string): boolean {
  return configurationIdPattern.test(value);
}

export function invalidConfigurationIdResponse(): NextResponse {
  return NextResponse.json(
    { detail: "A valid form configuration identifier is required." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export async function proxyFormConfigurationGet(pathname: string): Promise<NextResponse> {
  const url = marketplaceUrl(pathname);
  if (!url) {
    return NextResponse.json(
      { detail: "Marketplace API is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(url.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

export async function proxyFormConfigurationMutation(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  const url = marketplaceUrl(pathname);
  if (!url) {
    return NextResponse.json(
      { detail: "Marketplace API is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = ["POST", "PATCH", "PUT"].includes(request.method)
    ? await request.text()
    : undefined;
  const contentType = request.headers.get("content-type");

  try {
    return superAdminJsonResponse(
      await requestSuperAdminUpstreamJson(url.toString(), {
        method: request.method,
        ...(body ? { body } : {}),
        ...(contentType ? { headers: { "Content-Type": contentType } } : {}),
      }),
    );
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
