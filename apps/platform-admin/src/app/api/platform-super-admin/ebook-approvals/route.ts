import { NextRequest } from "next/server";

import { proxyEbookApproval } from "./_lib";

export async function GET(request: NextRequest) {
  return proxyEbookApproval(request, ["pending"]);
}
