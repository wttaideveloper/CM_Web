import {
  getSuperAdminUpstreamJson,
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { NextRequest, NextResponse } from "next/server";

const MARKETPLACE_API_BASE_URL = process.env.CHAT_API_BASE_URL;

/** Proxies the Marketplace Enterprise collection through the dedicated server-only Super Admin session. */
export async function GET() {
  if (!MARKETPLACE_API_BASE_URL) {
    return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let marketplaceUrl: URL;
  try {
    marketplaceUrl = new URL(MARKETPLACE_API_BASE_URL);
  } catch {
    return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  if (marketplaceUrl.protocol !== "https:" || marketplaceUrl.hostname !== "chat.wisdomtooth.tech") {
    return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  marketplaceUrl.pathname = "/api/v1/enterprises/";
  marketplaceUrl.search = "";
  try {
    return superAdminJsonResponse(await getSuperAdminUpstreamJson(marketplaceUrl.toString()));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!MARKETPLACE_API_BASE_URL) {
    return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const marketplaceUrl = new URL(MARKETPLACE_API_BASE_URL);
    if (marketplaceUrl.protocol !== "https:" || marketplaceUrl.hostname !== "chat.wisdomtooth.tech") throw new Error("Invalid Marketplace API URL");
    marketplaceUrl.pathname = "/api/v1/enterprises/";
    marketplaceUrl.search = "";
    const body = await request.text();
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(marketplaceUrl.toString(), { method: "POST", ...(body ? { body } : {}), headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" } }));
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Marketplace API URL") return NextResponse.json({ detail: "Marketplace API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return superAdminErrorResponse(error);
  }
}
