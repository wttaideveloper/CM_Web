import { NextRequest } from "next/server";

import { proxyTrainingApprovalGet } from "./_lib";

/** Pending approvals queue — `GET /api/v1/admin/trainings/pending` (query string forwarded). */
export async function GET(request: NextRequest) {
  return proxyTrainingApprovalGet("/api/v1/admin/trainings/pending", request.nextUrl.search, ["pending"]);
}
