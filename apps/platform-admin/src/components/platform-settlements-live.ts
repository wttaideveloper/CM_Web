import type { SettlementConfigResponse, SettlementListParams, SettlementListResponse, SettlementResponse } from "@ihp/commerce";

export type SettlementFilters = {
  tenantId: string;
  status: string;
  from: string;
  to: string;
};

/** Builds only parameters present in the repository's settlement-list contract. */
export function buildSettlementListParams(filters: SettlementFilters, page: number, pageSize: number): SettlementListParams {
  return {
    tenant_id: filters.tenantId.trim() || undefined,
    status: filters.status.trim() || undefined,
    date_from: filters.from || undefined,
    date_to: filters.to || undefined,
    page,
    page_size: pageSize,
  };
}

/** Uses authoritative total and response pagination when present, with safe request-value fallbacks. */
export function getSettlementPagination(
  response: Pick<SettlementListResponse, "items" | "total"> & Partial<Pick<SettlementListResponse, "page" | "page_size">>,
  requestedPage: number,
  requestedPageSize: number,
) {
  const page = Number.isInteger(response.page) && (response.page ?? 0) > 0 ? response.page! : requestedPage;
  const pageSize = Number.isInteger(response.page_size) && (response.page_size ?? 0) > 0 ? response.page_size! : requestedPageSize;
  const total = Number.isInteger(response.total) && response.total >= 0 ? response.total : response.items.length;
  return { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Selects backend amount strings without parsing, formatting, summing or converting them. */
export function getSettlementAmountFields(settlement: SettlementResponse) {
  return {
    gross: settlement.gross_amount,
    refunds: settlement.refund_amount,
    commission: settlement.commission_amount,
    gatewayFees: settlement.fee_amount,
    fixedFees: settlement.fixed_fee_amount,
    net: settlement.net_amount,
  } as const;
}

/** Configuration data is queried only for a valid, explicitly selected tenant. */
export function isSettlementTenantId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export function settlementConfigMatchesTenant(config: SettlementConfigResponse, selectedTenantId: string): boolean {
  return isSettlementTenantId(selectedTenantId) && config.tenant_id === selectedTenantId.trim();
}

/** Avoid exposing arbitrary payout-account fields; this is only a presence indicator. */
export function getPayoutAccountDisplay(config: SettlementConfigResponse): "withheld" | "notSupplied" {
  return config.payout_account ? "withheld" : "notSupplied";
}

export function settlementErrorKey(status: number | undefined): "sessionExpired" | "accessDenied" | "resourceNotFound" | "invalidRequest" | "dataUnavailable" {
  if (status === 401) return "sessionExpired";
  if (status === 403) return "accessDenied";
  if (status === 404) return "resourceNotFound";
  if (status === 422) return "invalidRequest";
  return "dataUnavailable";
}
