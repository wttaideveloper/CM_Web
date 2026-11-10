import { NextRequest, NextResponse } from "next/server";

import { resolveWorkflowUrl, type WorkflowResource } from "@/lib/workflow-url";
import { requestSuperAdminUpstreamJson, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Proxies one Workflow API request through the server-only Super Admin bearer bridge.
 *
 * The upstream is validated first: an unconfigured or untrusted Workflow origin, or an unsafe path, is
 * refused before the Super Admin token is even obtained, so the bearer can only reach an allowlisted origin.
 */
export async function proxyWorkflowRequest(request: NextRequest, resource: WorkflowResource, path: readonly string[]): Promise<NextResponse> {
  const target = resolveWorkflowUrl(resource, path, new URL(request.url).search, request.nextUrl.pathname);
  if (!target.ok) {
    if (target.reason === "invalid-path") return NextResponse.json({ detail: "Invalid Workflow path." }, { status: 400, headers: NO_STORE });
    // Untrusted and unconfigured look the same to the caller: the Workflow API is not available.
    return NextResponse.json({ detail: "Workflow API is not configured." }, { status: 503, headers: NO_STORE });
  }

  const contentType = request.headers.get("content-type");
  const isMultipart = Boolean(contentType?.toLowerCase().startsWith("multipart/form-data"));
  const body = request.method === "GET" || request.method === "DELETE"
    ? undefined
    : isMultipart
      ? await request.arrayBuffer()
      : await request.text();
  try {
    return superAdminJsonResponse(await requestSuperAdminUpstreamJson(target.url.toString(), {
      method: request.method,
      ...(body ? { body } : {}),
      ...(contentType ? { headers: { "Content-Type": contentType } } : {}),
    }));
  } catch (error) {
    return superAdminErrorResponse(error);
  }
}
