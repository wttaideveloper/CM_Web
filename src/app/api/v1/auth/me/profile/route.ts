import type { NextRequest } from "next/server";

import { forwardBearerRequest } from "@/lib/server/bearer-forward";

export async function PATCH(request: NextRequest) {
  return forwardBearerRequest(request, "/api/v1/auth/me/profile");
}
