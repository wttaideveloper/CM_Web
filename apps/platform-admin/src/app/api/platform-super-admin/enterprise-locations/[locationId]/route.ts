import { NextRequest, NextResponse } from "next/server";

import {
  getSuperAdminUpstreamJson,
  isTenantUuid,
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;

type RouteContext = { params: Promise<{ locationId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { locationId } = await context.params;
  if (!isTenantUuid(locationId)) {
    return NextResponse.json({ detail: "A valid location identifier is required." }, { status: 400 });
  }

  try {
    const marketplaceUrl = new URL(MARKETPLACE_API_BASE_URL ?? "");
    if (marketplaceUrl.protocol !== "https:" || marketplaceUrl.hostname !== "chat.wisdomtooth.tech") {
      throw new Error("Invalid Marketplace API URL");
    }
    marketplaceUrl.pathname = `/api/v1/locations/${locationId}`;
    marketplaceUrl.search = "";
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(marketplaceUrl.toString()));
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Marketplace API URL") {
      return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503 });
    }
    return superAdminErrorResponse(error);
  }
}

async function mutateLocation(request: NextRequest, context: RouteContext) {
  const { locationId } = await context.params;
  if (!isTenantUuid(locationId)) return NextResponse.json({ detail: "A valid location identifier is required." }, { status: 400 });

  try {
    const marketplaceUrl = new URL(MARKETPLACE_API_BASE_URL ?? "");
    if (marketplaceUrl.protocol !== "https:" || marketplaceUrl.hostname !== "chat.wisdomtooth.tech") throw new Error("Invalid Marketplace API URL");
    marketplaceUrl.pathname = `/api/v1/locations/${locationId}`;
    marketplaceUrl.search = "";
    const body = request.method === "PUT" ? await request.text() : undefined;
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(marketplaceUrl.toString(), { method: request.method, ...(body ? { body } : {}), ...(body ? { headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" } } : {}) }));
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Marketplace API URL") return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503 });
    return superAdminErrorResponse(error);
  }
}

export function PUT(request: NextRequest, context: RouteContext) {
  return mutateLocation(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return mutateLocation(request, context);
}
