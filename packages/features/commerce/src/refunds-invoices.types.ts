import type { CommerceDateRangeParams, CommercePageParams, CommerceRecord, CommercePageResponse } from "./common.types";

export interface RefundListParams extends CommercePageParams, CommerceDateRangeParams {
  status?: string;
  payment_id?: string;
  tenant_id?: string;
  overdue?: boolean;
}

export interface RefundResponse {
  id: string;
  payment_id: string;
  tenant_id?: string | null;
  status: string;
  status_label: string;
  refund_type: string;
  amount: string;
  currency: string;
  reason?: string | null;
  destination: string;
  bank_reference?: string | null;
  tax_refunded: string;
  decision_reason?: string | null;
  decided_at?: string | null;
  approved_at?: string | null;
  completed_at?: string | null;
  sla_due_at?: string | null;
  is_overdue?: boolean;
  escalated_at?: string | null;
  failure_reason?: string | null;
  credit_note_id?: string | null;
  requested_by_role?: string | null;
  created_at: string;
  actions?: readonly string[];
}

export type RefundListResponse = CommercePageResponse<RefundResponse>;

export interface InvoiceListParams extends CommercePageParams, CommerceDateRangeParams {
  doc_type?: "invoice" | "credit_note" | "debit_note";
  payment_id?: string;
  search?: string;
  tenant_id?: string;
}

export interface InvoiceLine {
  description: string;
  category?: string | null;
  quantity?: number;
  unit_price: string;
  net: string;
  tax: string;
  gross: string;
  taxes?: readonly CommerceRecord[];
}

export interface InvoiceTaxRow {
  tax_type?: string | null;
  name: string;
  rate: string;
  taxable_amount: string;
  tax_amount: string;
}

export interface InvoiceResponse {
  id: string;
  doc_type: string;
  number: string;
  status: string;
  tenant_id?: string | null;
  customer_user_id?: string | null;
  payment_id: string;
  refund_id?: string | null;
  parent_invoice_id?: string | null;
  currency: string;
  item_currency: string;
  exchange_rate: string;
  base_currency: string;
  base_rate: string;
  base_total: string;
  subtotal: string;
  tax_total: string;
  total: string;
  lines?: readonly InvoiceLine[];
  tax_breakdown?: readonly InvoiceTaxRow[];
  billing?: CommerceRecord | null;
  supplier?: CommerceRecord | null;
  notes?: string | null;
  reason?: string | null;
  issued_at: string;
  emailed_at?: string | null;
  email_count?: number;
  download_path?: string | null;
}

export type InvoiceListResponse = CommercePageResponse<InvoiceResponse>;

export interface InvoiceTemplateResponse {
  tenant_id?: string | null;
  is_default?: boolean;
  display_name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  footer_text?: string | null;
  terms?: string | null;
  number_prefix?: string;
  locale?: string;
  accent_color?: string;
  show_exchange_rate?: boolean;
}

export interface InvoiceTemplateParams {
  tenant_id?: string;
}
