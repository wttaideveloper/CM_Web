import { NextRequest } from "next/server";

import { proxyTrainingApprovalList } from "../_lib";

/**
 * Training approval queue list — `GET /api/v1/trainings?status=&page=&page_size=&search=`,
 * proxied with the Super Admin bearer token. Only `status`/`page`/`page_size`/`search` are
 * forwarded (see `proxyTrainingApprovalList`); this is a static segment, so it takes priority
 * over the `[...path]` catch-all and never touches its UUID/action allowlist.
 */
export async function GET(request: NextRequest) {
  return proxyTrainingApprovalList(request.nextUrl.searchParams);
}
