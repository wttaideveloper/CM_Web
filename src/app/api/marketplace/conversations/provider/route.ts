import type { NextRequest } from "next/server";

import { forwardMarketplaceRequest } from "@/lib/server/marketplace-forward";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return forwardMarketplaceRequest(request, "/conversations/provider");
}
