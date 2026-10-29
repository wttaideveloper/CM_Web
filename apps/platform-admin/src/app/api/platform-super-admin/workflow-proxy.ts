import { NextRequest, NextResponse } from "next/server";

import { requestSuperAdminUpstreamJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

const WORKFLOW_API_BASE_URL = process.env.WORKFLOW_API_BASE_URL;

function workflowUrl(resource: "forms" | "workflows" | "media", path: readonly string[], request: NextRequest): URL | null {
  if (!WORKFLOW_API_BASE_URL) return null;
  try {
    const base = new URL(WORKFLOW_API_BASE_URL);
    base.pathname = `/api/v1/${resource}${path.length ? `/${path.map((segment) => encodeURIComponent(segment)).join("/")}` : ""}`;
    base.search = new URL(request.url).search;
    return base;
  } catch {
    return null;
  }
}

/** Proxies one Workflow API request through the server-only Super Admin bearer bridge. */
export async function proxyWorkflowRequest(request: NextRequest, resource: "forms" | "workflows" | "media", path: readonly string[]): Promise<NextResponse> {
  const url = workflowUrl(resource, path, request);
  if (!url) return NextResponse.json({ detail: "Workflow API is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const body = request.method === "GET" || request.method === "DELETE" ? undefined : await request.text();
  const contentType = request.headers.get("content-type");
  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(url.toString(), {
      method: request.method,
      ...(body ? { body } : {}),
      ...(contentType ? { headers: { "Content-Type": contentType } } : {}),
    }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
