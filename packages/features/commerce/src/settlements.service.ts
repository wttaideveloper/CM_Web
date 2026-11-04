import { commerceGet, commercePathSegment, type CommerceRequestOptions } from "./commerce-client";
import type { SettlementConfigParams, SettlementConfigResponse, SettlementDetailResponse, SettlementListParams, SettlementListResponse } from "./settlements-reports.types";

/** Lists settlements using the documented tenant, status and date filters. */
export function listSettlements(params: SettlementListParams = {}, options: CommerceRequestOptions = {}): Promise<SettlementListResponse> {
  return commerceGet<SettlementListResponse>("/settlements", params, options);
}

/** Retrieves one settlement and its backend-provided line items. */
export function getSettlement(settlementId: string, options: CommerceRequestOptions = {}): Promise<SettlementDetailResponse> {
  return commerceGet<SettlementDetailResponse>(`/settlements/${commercePathSegment(settlementId, "settlementId")}`, undefined, options);
}

/** Retrieves settlement configuration without exposing or mutating payout credentials. */
export function getSettlementConfig(params: SettlementConfigParams = {}, options: CommerceRequestOptions = {}): Promise<SettlementConfigResponse> {
  return commerceGet<SettlementConfigResponse>("/settlements/config", params, options);
}
