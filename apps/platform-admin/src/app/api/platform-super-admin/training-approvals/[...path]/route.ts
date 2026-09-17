import { NextRequest } from "next/server";

import { proxyTrainingApprovalGet, proxyTrainingApprovalMutation } from "../_lib";

type RouteContext = { params: Promise<{ path: string[] }> };

/** Admin training detail — `GET /api/v1/admin/trainings/{id}`. */
export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyTrainingApprovalGet(`/api/v1/admin/trainings/${path.join("/")}`, request.nextUrl.search, path);
}

/** Approve / reject / publish / request-changes — `POST /api/v1/admin/trainings/{id}/{action}`. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyTrainingApprovalMutation(request, `/api/v1/admin/trainings/${path.join("/")}`, path);
}
