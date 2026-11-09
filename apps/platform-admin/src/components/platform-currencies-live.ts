import type { CommerceJsonValue, RateHistoryResponse } from "@ihp/commerce";

/** Reads only a backend-supplied base-currency value without deriving or converting it. */
export function readBaseCurrency(value: CommerceJsonValue | undefined, fallback?: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = (value as { readonly [key: string]: CommerceJsonValue }).base_currency;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return fallback?.trim() || "Not supplied";
}

/** Resolves safe UI pagination from the request when the backend omits echoed page fields. */
export function resolveRateHistoryPagination(
  response: RateHistoryResponse | undefined,
  requestedPage: number,
  requestedPageSize: number,
): { page: number; pageSize: number; total: number; totalPages: number } {
  const responsePage = response?.page;
  const responsePageSize = response?.page_size;
  const responseTotal = response?.total;
  const page = typeof responsePage === "number" && Number.isInteger(responsePage) && responsePage > 0 ? responsePage : requestedPage;
  const pageSize = typeof responsePageSize === "number" && Number.isInteger(responsePageSize) && responsePageSize > 0 ? responsePageSize : requestedPageSize;
  const total = typeof responseTotal === "number" && Number.isFinite(responseTotal) && responseTotal >= 0 ? responseTotal : 0;
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
