import type { CommerceDateRangeParams, CommercePageParams, CommerceRecord, CommercePageResponse } from "./common.types";

export interface SettlementListParams extends CommercePageParams, CommerceDateRangeParams {
  status?: string;
  tenant_id?: string;
}

export interface SettlementResponse {
  id: string;
  reference: string;
  tenant_id: string;
  status: string;
  period_start: string;
  period_end: string;
  currency: string;
  base_currency: string;
  exchange_rate: string;
  gross_amount: string;
  refund_amount: string;
  commission_amount: string;
  fee_amount: string;
  fixed_fee_amount: string;
  tax_collected: string;
  net_amount: string;
  items_count: number;
  payout_reference?: string | null;
  paid_at?: string | null;
  failure_reason?: string | null;
  created_at: string;
  actions?: readonly string[];
}

/** Some deployed collection responses omit page metadata; the client falls back to its requested values. */
export interface SettlementListResponse {
  items: readonly SettlementResponse[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface SettlementItemResponse {
  id: string;
  kind: string;
  payment_id?: string | null;
  refund_id?: string | null;
  charge_currency: string;
  charge_amount: string;
  gross: string;
  commission: string;
  fee: string;
  fixed_fee: string;
  net: string;
}

export interface SettlementDetailResponse extends SettlementResponse {
  items?: readonly SettlementItemResponse[];
}

export interface SettlementConfigParams {
  tenant_id?: string;
}

export interface SettlementConfigResponse {
  tenant_id: string;
  schedule: string;
  weekday: number;
  month_day: number;
  currency: string;
  commission_percent?: string | null;
  effective_commission_percent?: string | null;
  fixed_fee: string;
  min_payout: string;
  hold: boolean;
  payout_account?: CommerceRecord | null;
  last_run_at?: string | null;
  updated_at?: string | null;
}

export interface CommerceReportDateParams extends CommerceDateRangeParams {
  tenant_id?: string;
}

export interface CommerceOverview {
  base_currency: string;
  period: { date_from?: string | null; date_to?: string | null };
  payments: CommerceRecord;
  refunds: CommerceRecord;
  tax: CommerceRecord;
  settlements: CommerceRecord;
  needs_attention: CommerceRecord;
}

export interface PaymentReportParams extends CommerceReportDateParams {
  status?: string;
  currency?: string;
  format?: "json" | "csv";
  page?: number;
  page_size?: number;
}

export interface RefundReportParams extends CommerceReportDateParams {
  status?: string;
  format?: "json" | "csv";
  page?: number;
  page_size?: number;
}

export interface SettlementReportParams extends CommerceReportDateParams {
  status?: string;
  format?: "json" | "csv";
  page?: number;
  page_size?: number;
}

export interface CurrencyReportParams extends CommerceReportDateParams {
  format?: "json" | "csv";
}

export interface ExchangeRateReportParams extends CommerceDateRangeParams {
  quote?: string;
  format?: "json" | "csv";
}

export interface ReconciliationReportParams extends CommerceDateRangeParams {
  format?: "json" | "csv";
}

export interface PaymentReportOut {
  base_currency: string;
  rows: readonly CommerceRecord[];
  total_rows: number;
  page: number;
  page_size: number;
  totals: CommerceRecord;
}

export interface RefundReportOut {
  base_currency: string;
  rows: readonly CommerceRecord[];
  total_rows: number;
  page: number;
  page_size: number;
  totals: CommerceRecord;
}

export interface SettlementReportOut {
  rows: readonly CommerceRecord[];
  total_rows: number;
  page: number;
  page_size: number;
  totals: CommerceRecord;
}

export interface CurrencyReportOut {
  base_currency: string;
  rows: readonly CommerceRecord[];
  totals: CommerceRecord;
}

export interface ExchangeRateReportOut {
  base_currency: string;
  summary: readonly CommerceRecord[];
  rows: readonly CommerceRecord[];
  total_rows: number;
}

export interface ReconciliationReportOut {
  rows: readonly CommerceRecord[];
  by_issue: readonly CommerceRecord[];
  totals: CommerceRecord;
}

export interface AuditListParams extends CommercePageParams, CommerceDateRangeParams {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_id?: string;
  tenant_id?: string;
}

export interface AuditEntryResponse {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  tenant_id?: string | null;
  before?: CommerceRecord | null;
  after?: CommerceRecord | null;
  reason?: string | null;
  created_at: string;
}

export type AuditListResponse = CommercePageResponse<AuditEntryResponse>;

export interface GatewayProviderStatus {
  provider: string;
  label?: string | null;
  active?: boolean | null;
  configured?: boolean | null;
  mode?: string | null;
  webhook_secret_set?: boolean | null;
  publishable_key_set?: boolean | null;
  webhook_url?: string | null;
  webhook_events?: readonly string[] | null;
}

export interface GatewayStatus {
  editable?: boolean | null;
  edit_note?: string | null;
  active_gateway?: string | null;
  active_mode?: string | null;
  providers?: readonly GatewayProviderStatus[] | null;
  base_currency?: string | null;
  exchange_rates?: CommerceRecord | null;
  tax?: CommerceRecord | null;
  jobs?: CommerceRecord | null;
  limits?: CommerceRecord | null;
  risk?: CommerceRecord | null;
  settlement_defaults?: CommerceRecord | null;
  warnings?: readonly string[] | null;
}

export type ReconciliationRunListParams = CommercePageParams;

export interface ReconciliationRunResponse {
  id: string;
  kind: string;
  provider?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  total_rows: number;
  matched: number;
  mismatched: number;
  created_by?: string | null;
  created_at: string;
  items?: readonly CommerceRecord[] | null;
}

export interface ReconciliationRunListResponse {
  items: readonly ReconciliationRunResponse[];
  total: number;
}

export interface ReconciliationRunDetailsParams {
  issue?: string;
  resolved?: boolean;
}
