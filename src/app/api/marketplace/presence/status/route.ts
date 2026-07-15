import type { NextRequest } from "next/server";

import { forwardMarketplaceRequest } from "@/lib/server/marketplace-forward";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  return forwardMarketplaceRequest(request, "/presence/status");
}
