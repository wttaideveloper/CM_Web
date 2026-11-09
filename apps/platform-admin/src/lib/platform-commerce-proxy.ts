export type PlatformCommerceProxyRequest = {
  upstreamUrl: string;
  init: Pick<RequestInit, "headers" | "method">;
};

/** Returns whether a path belongs to the read-only Commerce surface exposed by Platform Admin. */
export function isPlatformCommerceReadPath(path: readonly string[]): boolean {
  if (!path.every((segment) => Boolean(segment))) return false;
  if (path[0] === "tax") {
    return (path.length === 2 && (path[1] === "rules" || path[1] === "history" || path[1] === "exemptions" || path[1] === "reports"))
      || (path.length === 4 && path[1] === "rules" && isUuid(path[2]) && path[3] === "versions");
  }
  if (path[0] === "payment-reports") return path.length === 2 && ["overview", "payments", "refunds", "settlements", "currency", "exchange-rates", "reconciliation"].includes(path[1]);
  if (path[0] === "finance") return (path.length === 2 && ["gateway-status", "audit", "reconciliation"].includes(path[1]))
    || (path.length === 3 && path[1] === "reconciliation" && isUuid(path[2]));
  if (path[0] === "settlements") {
    return path.length === 1 || (path.length === 2 && (path[1] === "config" || isUuid(path[1])));
  }
  if (path[0] === "refunds") return path.length === 1 || (path.length === 2 && isUuid(path[1]));
  if (path[0] === "invoices") {
    return path.length === 1
      || (path.length === 2 && (path[1] === "templates" || isUuid(path[1])))
      || (path.length === 3 && isUuid(path[1]) && path[2] === "download");
  }
  if (path[0] === "currencies") {
    return path.length === 1
      || (path.length === 2 && (path[1] === "base" || path[1] === "rates"))
      || (path.length === 3 && path[1] === "admin" && path[2] === "all")
      || (path.length === 3 && path[1] === "rates" && path[2] === "history");
  }
  return path[0] === "payments"
    && (path.length === 1
      || (path.length === 2 && isPaymentUuid(path[1]))
      || (path.length === 3 && isPaymentUuid(path[1]) && path[2] === "transactions"));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isPaymentUuid(value: string | undefined): boolean {
  return value !== undefined && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Builds the upstream request while leaving bearer-token attachment to the server auth bridge. */
export function buildPlatformCommerceProxyRequest(
  path: readonly string[],
  requestUrl: string,
  chatApiBaseUrl: string,
): PlatformCommerceProxyRequest {
  if (!isPlatformCommerceReadPath(path)) throw new Error("Commerce resource not found.");
  const normalizedBaseUrl = chatApiBaseUrl.replace(/\/+$/, "");
  const apiV1Base = /\/api\/v1\/?$/.test(normalizedBaseUrl) ? normalizedBaseUrl : `${normalizedBaseUrl}/api/v1`;
  const upstream = new URL(`${apiV1Base}/${path.map((segment) => encodeURIComponent(segment)).join("/")}`);
  upstream.search = new URL(requestUrl).search;
  const isInvoiceDownload = path[0] === "invoices" && path.length === 3 && path[2] === "download";
  return {
    upstreamUrl: upstream.toString(),
    init: { method: "GET", headers: { Accept: isInvoiceDownload ? "application/pdf" : "application/json" } },
  };
}

/** @deprecated Use the Commerce-wide helper for new read-only endpoints. */
export const isPlatformPaymentReadPath = isPlatformCommerceReadPath;

/** @deprecated Use the Commerce-wide helper for new read-only endpoints. */
export const buildPlatformPaymentProxyRequest = buildPlatformCommerceProxyRequest;
