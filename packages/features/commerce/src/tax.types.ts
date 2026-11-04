import type { CommerceDateRangeParams, CommercePageParams, CommerceRecord, CommercePageResponse } from "./common.types";

export interface TaxRulesParams {
  country?: string;
  state?: string;
  tax_type?: string;
  current_only?: boolean;
}

/** Authenticated merchant tax profile returned by the read-only profile endpoint. */
export interface MerchantTaxProfileResponse {
  country: string;
  state: string | null;
  tax_id: string | null;
  tax_id_type: string | null;
  legal_name: string | null;
  address: string | null;
  is_tax_registered: boolean;
  tenant_id: string;
  updated_at: string | null;
}

export interface TaxRuleResponse {
  id: string;
  rule_key: string;
  version: number;
  tax_type: string;
  name: string;
  country: string;
  state?: string | null;
  rate: string;
  applies_to: string;
  condition: string;
  rounding_mode: string;
  reverse_charge_allowed: boolean;
  priority: number;
  valid_from: string;
  valid_to?: string | null;
  is_active: boolean;
  is_current?: boolean;
  supersedes_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface TaxRuleListResponse {
  items: readonly TaxRuleResponse[];
  total: number;
}

export interface TaxHistoryParams extends CommercePageParams, CommerceDateRangeParams {
  tenant_id?: string;
  payment_id?: string;
  country?: string;
  tax_type?: string;
}

export interface TaxTransactionResponse {
  id: string;
  payment_id: string;
  refund_id?: string | null;
  invoice_id?: string | null;
  tenant_id?: string | null;
  tax_type: string;
  name: string;
  country: string;
  state?: string | null;
  rate: string;
  taxable_amount: string;
  tax_amount: string;
  item_currency: string;
  tax_amount_charge: string;
  charge_currency: string;
  is_exempt: boolean;
  is_reverse_charge: boolean;
  created_at: string;
}

export type TaxHistoryResponse = CommercePageResponse<TaxTransactionResponse>;

/** Query filters supported by the read-only tax exemption collection endpoint. */
export interface TaxExemptionsParams extends CommercePageParams {
  status?: string;
  /** Super Admin-only filter; omit unless the user explicitly selects a user scope. */
  user_id?: string;
}

/** Backend-authoritative tax registration or exemption record. */
export interface TaxExemptionResponse {
  id: string;
  user_id: string;
  id_type: string;
  number: string;
  country: string;
  state?: string | null;
  legal_name?: string | null;
  status: string;
  format_valid: boolean;
  valid_until?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  created_at: string;
}

/** Page of backend-authoritative exemption and registration records. */
export interface TaxExemptionListResponse {
  items: readonly TaxExemptionResponse[];
  total: number;
}

export type TaxReportGroupBy = "tax_type" | "country" | "state" | "name" | "month" | "day";

export interface TaxReportParams extends CommerceDateRangeParams {
  group_by?: TaxReportGroupBy;
  tenant_id?: string;
  format?: "json" | "csv";
}

export interface TaxReportOut {
  group_by: TaxReportGroupBy | string;
  base_currency: string;
  rows: readonly CommerceRecord[];
  total_tax_base: string;
}
