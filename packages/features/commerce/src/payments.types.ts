import type { CommerceJsonValue, CommerceRecord, CommercePageParams, CommerceDateRangeParams, CommercePageResponse } from "./common.types";

export interface PaymentListParams extends CommercePageParams, CommerceDateRangeParams {
  status?: string;
  currency?: string;
  purchase_type?: string;
  purchase_id?: string;
  tenant_id?: string;
  customer_user_id?: string;
  needs_reconciliation?: boolean;
}

export interface PaymentLineOut {
  ref: string;
  description: string;
  category: string;
  tax_class?: string | null;
  quantity: number;
  unit_amount: string;
  net_amount: string;
  tax_amount: string;
  gross_amount: string;
  charge_net_amount: string;
  charge_tax_amount: string;
  charge_gross_amount: string;
  taxes?: readonly CommerceRecord[];
}

export interface TaxBreakdownRow {
  tax_type: string;
  name: string;
  rate: string;
  country: string;
  state?: string | null;
  taxable_amount: string;
  tax_amount: string;
}

export interface PaymentRisk {
  score?: number | null;
  decision?: string | null;
  reasons?: readonly string[];
}

export interface PaymentResponse {
  id: string;
  status: string;
  status_label: string;
  purchase_type: string;
  purchase_id: string;
  attempt_no: number;
  retry_of_id?: string | null;
  tenant_id?: string | null;
  customer_user_id?: string | null;
  customer_email?: string | null;
  provider: string;
  capture_method: string;
  item_currency: string;
  subtotal_amount: string;
  tax_amount: string;
  total_amount: string;
  charge_currency: string;
  charge_subtotal: string;
  charge_tax: string;
  charge_total: string;
  exchange_rate: string;
  base_currency: string;
  base_total: string;
  refunded_amount: string;
  refundable_amount: string;
  method_brand?: string | null;
  method_last4?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  next_action?: CommerceRecord | null;
  invoice_id?: string | null;
  lines: readonly PaymentLineOut[];
  tax_breakdown: readonly TaxBreakdownRow[];
  reverse_charge?: boolean;
  is_tax_exempt?: boolean;
  billing?: CommerceRecord | null;
  risk?: PaymentRisk | null;
  needs_reconciliation?: boolean;
  expires_at?: string | null;
  authorized_at?: string | null;
  captured_at?: string | null;
  failed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  actions?: readonly string[];
}

export type PaymentListResponse = CommercePageResponse<PaymentResponse>;

/** The deployed gateway transaction endpoint has an unconstrained JSON response schema. */
export type PaymentGatewayTransactionHistory = CommerceJsonValue;
