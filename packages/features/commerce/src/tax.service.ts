import { commerceGet, commercePathSegment } from "./commerce-client";
import type { CommerceRequestOptions } from "./commerce-client";
import type { MerchantTaxProfileResponse, TaxExemptionListResponse, TaxExemptionsParams, TaxHistoryParams, TaxHistoryResponse, TaxReportOut, TaxReportParams, TaxRuleListResponse, TaxRulesParams } from "./tax.types";

/** Retrieves the authenticated merchant's tax profile without allowing a tenant override. */
export function getMerchantTaxProfile(options?: CommerceRequestOptions): Promise<MerchantTaxProfileResponse> {
  return commerceGet<MerchantTaxProfileResponse>("/tax/merchant-profile", undefined, options);
}

/** Lists tax rules using the backend's current-only and jurisdiction filters. */
export function getTaxRules(params: TaxRulesParams = {}, options?: CommerceRequestOptions): Promise<TaxRuleListResponse> {
  return commerceGet<TaxRuleListResponse>("/tax/rules", params, options);
}

/** Retrieves every documented version of one tax rule. */
export function getTaxRuleHistory(ruleId: string, options?: CommerceRequestOptions): Promise<TaxRuleListResponse> {
  return commerceGet<TaxRuleListResponse>(`/tax/rules/${commercePathSegment(ruleId, "ruleId")}/versions`, undefined, options);
}

/** Retrieves paginated tax transaction history. */
export function getTaxHistory(params: TaxHistoryParams = {}, options?: CommerceRequestOptions): Promise<TaxHistoryResponse> {
  return commerceGet<TaxHistoryResponse>("/tax/history", params, options);
}

/** Lists backend-authoritative tax exemption and registration records. */
export function getTaxExemptions(params: TaxExemptionsParams = {}, options?: CommerceRequestOptions): Promise<TaxExemptionListResponse> {
  return commerceGet<TaxExemptionListResponse>("/tax/exemptions", params, options);
}

/** Retrieves the grouped tax report without calculating or converting amounts in the client. */
export function getTaxReport(params: TaxReportParams = {}, options?: CommerceRequestOptions): Promise<TaxReportOut> {
  return commerceGet<TaxReportOut>("/tax/reports", params, options);
}
