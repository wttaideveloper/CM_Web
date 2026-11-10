import { commerceGet, commercePathSegment, type CommerceRequestOptions } from "./commerce-client";
import type { AuditListParams, AuditListResponse, CommerceOverview, CurrencyReportOut, CurrencyReportParams, ExchangeRateReportOut, ExchangeRateReportParams, GatewayStatus, PaymentReportOut, PaymentReportParams, ReconciliationReportOut, ReconciliationReportParams, ReconciliationRunDetailsParams, ReconciliationRunListParams, ReconciliationRunListResponse, ReconciliationRunResponse, RefundReportOut, RefundReportParams, SettlementReportOut, SettlementReportParams } from "./settlements-reports.types";

/** Retrieves the backend-calculated Commerce overview for an optional tenant and date window. */
export function getCommerceOverview(params: { tenant_id?: string; date_from?: string; date_to?: string } = {}, options?: CommerceRequestOptions): Promise<CommerceOverview> {
  return commerceGet<CommerceOverview>("/payment-reports/overview", params, options);
}

/** Retrieves the backend-calculated payments report. */
export function getPaymentReport(params: PaymentReportParams = {}, options?: CommerceRequestOptions): Promise<PaymentReportOut> {
  return commerceGet<PaymentReportOut>("/payment-reports/payments", params, options);
}

/** Retrieves the backend-calculated refunds report. */
export function getRefundReport(params: RefundReportParams = {}, options?: CommerceRequestOptions): Promise<RefundReportOut> {
  return commerceGet<RefundReportOut>("/payment-reports/refunds", params, options);
}

/** Retrieves the backend-calculated settlements report. */
export function getSettlementReport(params: SettlementReportParams = {}, options?: CommerceRequestOptions): Promise<SettlementReportOut> {
  return commerceGet<SettlementReportOut>("/payment-reports/settlements", params, options);
}

/** Retrieves the backend-calculated currency report without mixing currencies locally. */
export function getCurrencyReport(params: CurrencyReportParams = {}, options?: CommerceRequestOptions): Promise<CurrencyReportOut> {
  return commerceGet<CurrencyReportOut>("/payment-reports/currency", params, options);
}

/** Retrieves the backend-calculated exchange-rate report. */
export function getExchangeRateReport(params: ExchangeRateReportParams = {}, options?: CommerceRequestOptions): Promise<ExchangeRateReportOut> {
  return commerceGet<ExchangeRateReportOut>("/payment-reports/exchange-rates", params, options);
}

/** Retrieves the backend-calculated reconciliation report. */
export function getReconciliationReport(params: ReconciliationReportParams = {}, options?: CommerceRequestOptions): Promise<ReconciliationReportOut> {
  return commerceGet<ReconciliationReportOut>("/payment-reports/reconciliation", params, options);
}

/** Retrieves gateway configuration/status without offering credential mutation. */
export function getGatewayStatus(options?: CommerceRequestOptions): Promise<GatewayStatus> {
  return commerceGet<GatewayStatus>("/finance/gateway-status", {}, options);
}

/** Retrieves paginated Commerce audit history. */
export function getCommerceAuditHistory(params: AuditListParams = {}, options?: CommerceRequestOptions): Promise<AuditListResponse> {
  return commerceGet<AuditListResponse>("/finance/audit", params, options);
}

/** Lists backend reconciliation runs. */
export function getReconciliationRuns(params: ReconciliationRunListParams = {}, options?: CommerceRequestOptions): Promise<ReconciliationRunListResponse> {
  return commerceGet<ReconciliationRunListResponse>("/finance/reconciliation", params, options);
}

/** Retrieves one reconciliation run and its backend-provided details. */
export function getReconciliationRun(runId: string, params: ReconciliationRunDetailsParams = {}, options?: CommerceRequestOptions): Promise<ReconciliationRunResponse> {
  return commerceGet<ReconciliationRunResponse>(`/finance/reconciliation/${commercePathSegment(runId, "runId")}`, params, options);
}
