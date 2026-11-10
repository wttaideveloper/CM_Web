import { commerceGet, type CommerceRequestOptions } from "./commerce-client";
import type { CommerceJsonValue } from "./common.types";
import type { CurrencyListResponse, RateHistoryParams, RateHistoryResponse, RateListResponse } from "./currencies.types";

/** Lists active platform-supported currencies. */
export function getSupportedCurrencies(options?: CommerceRequestOptions): Promise<CurrencyListResponse> {
  return commerceGet<CurrencyListResponse>("/currencies", {}, options);
}

/** Lists all currencies, including switched-off currencies, for Super Admin use. */
export function getAllCurrencies(options?: CommerceRequestOptions): Promise<CurrencyListResponse> {
  return commerceGet<CurrencyListResponse>("/currencies/admin/all", {}, options);
}

/** Retrieves the unconstrained JSON base-currency response published by the backend. */
export function getBaseCurrency(options?: CommerceRequestOptions): Promise<CommerceJsonValue> {
  return commerceGet<CommerceJsonValue>("/currencies/base", {}, options);
}

/** Retrieves current exchange rates, optionally filtered to one quote currency. */
export function getCurrentRates(quote?: string, options?: CommerceRequestOptions): Promise<RateListResponse> {
  return commerceGet<RateListResponse>("/currencies/rates", { quote }, options);
}

/** Retrieves paginated exchange-rate history with the documented filters. */
export function getRateHistory(params: RateHistoryParams = {}, options?: CommerceRequestOptions): Promise<RateHistoryResponse> {
  return commerceGet<RateHistoryResponse>("/currencies/rates/history", params, options);
}
