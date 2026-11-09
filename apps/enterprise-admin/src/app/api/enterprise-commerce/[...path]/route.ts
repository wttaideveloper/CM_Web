import { NextRequest } from "next/server";

import { normalizeUpstreamBaseUrl } from "@ihp/shared/upstream-config";

import { enterprisePaymentMethodNotAllowed, forwardEnterpriseCommerceRead } from "@/lib/enterprise-commerce-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCESS_TOKEN_COOKIE = "access_token";

/** Proxies only authenticated, read-only Enterprise Commerce requests. */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  const result = await forwardEnterpriseCommerceRead({
    path,
    requestUrl: request.url,
    accessToken: request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
    // Same validation as the chat proxy: https, or cleartext http for a private host only.
    apiBaseUrl: normalizeUpstreamBaseUrl(process.env.CHAT_API_BASE_URL) ?? undefined,
  });
  return result.response;
}

/** Rejects methods outside the Enterprise Payments read-only contract. */
export function POST(): Response { return enterprisePaymentMethodNotAllowed(); }
/** Rejects methods outside the Enterprise Payments read-only contract. */
export function PUT(): Response { return enterprisePaymentMethodNotAllowed(); }
/** Rejects methods outside the Enterprise Payments read-only contract. */
export function PATCH(): Response { return enterprisePaymentMethodNotAllowed(); }
/** Rejects methods outside the Enterprise Payments read-only contract. */
export function DELETE(): Response { return enterprisePaymentMethodNotAllowed(); }
/** Rejects methods outside the Enterprise Payments read-only contract. */
export function HEAD(): Response { return enterprisePaymentMethodNotAllowed(); }
/** Rejects methods outside the Enterprise Payments read-only contract. */
export function OPTIONS(): Response { return enterprisePaymentMethodNotAllowed(); }
