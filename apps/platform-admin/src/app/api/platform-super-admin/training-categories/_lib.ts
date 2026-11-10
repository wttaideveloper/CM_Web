import { NextRequest, NextResponse } from "next/server";

import {
  requestSuperAdminUpstreamJson,
  superAdminErrorResponse,
  superAdminJsonResponse,
} from "@/lib/super-admin-server-client";
import { resolveMarketplaceUrl } from "@/lib/marketplace-url";

const categoryIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function trainingCategoryUrl(categoryId?: string): URL | null {
  return resolveMarketplaceUrl(categoryId
      ? `/api/v1/training-categories/${encodeURIComponent(categoryId)}`
      : "/api/v1/training-categories/");
}

/** Validates the backend-owned Training Category UUID path parameter. */
export function isTrainingCategoryId(value: string): boolean {
  return categoryIdPattern.test(value);
}

export function invalidTrainingCategoryIdResponse(): NextResponse {
  return NextResponse.json(
    { detail: "A valid Training Category identifier is required." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

/** Proxies Training taxonomy reads and mutations through the server-only Super Admin session. */
export async function proxyTrainingCategoryRequest(request: NextRequest, categoryId?: string): Promise<NextResponse> {
  const url = trainingCategoryUrl(categoryId);
  if (!url) {
    return NextResponse.json(
      { detail: "Marketplace API is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

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
