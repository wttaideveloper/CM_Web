import type { RefundListParams, RefundListResponse } from "@ihp/commerce";

/** Filter state limited to the deployed refund collection query contract. */
export type RefundListFilters = {
  status: string;
  paymentId: string;
  tenantId: string;
  overdue: "all" | "true" | "false";
  from: string;
  to: string;
};

/** Converts a date input to a UTC range boundary accepted by the refund API. */
export function refundDateTime(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const time = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = Date.parse(`${value}${time}`);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

/** Builds only the filters and pagination documented for GET /refunds. */
export function buildRefundListParams(filters: RefundListFilters, page: number, pageSize: number): RefundListParams {
  return {
    status: filters.status || undefined,
    payment_id: filters.paymentId || undefined,
    tenant_id: filters.tenantId || undefined,
    overdue: filters.overdue === "all" ? undefined : filters.overdue === "true",
    date_from: refundDateTime(filters.from),
    date_to: refundDateTime(filters.to, true),
    page,
    page_size: pageSize,
  };
}

/** Uses response pagination when present and safe request values as a defensive fallback. */
export function getRefundPagination(response: Pick<RefundListResponse, "items" | "total"> & Partial<Pick<RefundListResponse, "page" | "page_size">>, requestedPage: number, requestedPageSize: number) {
  const page = Number.isInteger(response.page) && (response.page ?? 0) > 0 ? response.page! : requestedPage;
  const pageSize = Number.isInteger(response.page_size) && (response.page_size ?? 0) > 0 ? response.page_size! : requestedPageSize;
  const total = Number.isInteger(response.total) && response.total >= 0 ? response.total : response.items.length;
  return { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Presents backend action identifiers without granting permission to execute them. */
export function refundActionLabel(action: string): string {
  const labels: Record<string, string> = {
    view_details: "View details",
    approve: "Approve",
    reject: "Reject",
    retry: "Retry refund",
    full_refund: "Full refund",
    partial_refund: "Partial refund",
    record_manual_completion: "Record manual completion",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}
