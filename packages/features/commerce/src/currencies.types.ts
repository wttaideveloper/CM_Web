import type { CommerceDateRangeParams, CommercePageParams } from "./common.types";

export interface CurrencyResponse {
  code: string;
  name: string;
  symbol?: string | null;
  decimals: number;
  is_active: boolean;
  is_base?: boolean;
  min_amount?: string | null;
  max_amount?: string | null;
  sort_order?: number;
}

export interface CurrencyListResponse {
  base_currency: string;
  items: readonly CurrencyResponse[];
  total: number;
}

export interface RateResponse {
  base_currency: string;
  quote_currency: string;
  rate: string;
  source: string;
  pinned?: boolean;
  updated_at?: string | null;
}

export interface RateListResponse {
  base_currency: string;
  items: readonly RateResponse[];
  total: number;
}

export interface RateHistoryEntry {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: string;
  source: string;
  provider?: string | null;
  pinned?: boolean;
  created_by?: string | null;
  note?: string | null;
  created_at: string;
}

export interface RateHistoryParams extends CommercePageParams, CommerceDateRangeParams {
  quote?: string;
}

export interface RateHistoryResponse {
  items: readonly RateHistoryEntry[];
  total: number;
  /** Older/deployed responses may omit the echoed request page. */
  page?: number;
  /** Older/deployed responses may omit the echoed request page size. */
  page_size?: number;
}
