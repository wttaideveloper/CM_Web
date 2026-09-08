import { NextRequest, NextResponse } from "next/server";

import {
  getSuperAdminUpstreamJson,
  isTenantUuid,
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;

type RouteContext = { params: Promise<{ enterpriseId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { enterpriseId } = await context.params;
  if (!isTenantUuid(enterpriseId)) {
    return NextResponse.json({ detail: "A valid enterprise identifier is required." }, { status: 400 });
  }

  try {
    const marketplaceUrl = new URL(MARKETPLACE_API_BASE_URL ?? "");
    if (marketplaceUrl.protocol !== "https:" || marketplaceUrl.hostname !== "chat.wisdomtooth.tech") {
      throw new Error("Invalid Marketplace API URL");
    }
    marketplaceUrl.pathname = `/api/v1/enterprises/${enterpriseId}/locations`;
    marketplaceUrl.search = "";
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(marketplaceUrl.toString()));
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Marketplace API URL") {
      return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503 });
    }
    return superAdminErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { enterpriseId } = await context.params;
  if (!isTenantUuid(enterpriseId)) return NextResponse.json({ detail: "A valid enterprise identifier is required." }, { status: 400 });

  try {
    const marketplaceUrl = new URL(MARKETPLACE_API_BASE_URL ?? "");
    if (marketplaceUrl.protocol !== "https:" || marketplaceUrl.hostname !== "chat.wisdomtooth.tech") throw new Error("Invalid Marketplace API URL");
    marketplaceUrl.pathname = `/api/v1/enterprises/${enterpriseId}/locations`;
    marketplaceUrl.search = "";
    const body = await request.text();
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(marketplaceUrl.toString(), { method: "POST", ...(body ? { body } : {}), headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" } }));
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Marketplace API URL") return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503 });
    return superAdminErrorResponse(error);
  }
}
