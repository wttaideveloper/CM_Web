import { commerceGet, commercePathSegment, type CommerceRequestOptions } from "./commerce-client";
import type { PaymentGatewayTransactionHistory, PaymentListParams, PaymentListResponse, PaymentResponse } from "./payments.types";

/** Lists payments using only filters documented by the deployed Payments API. */
export function listPayments(params: PaymentListParams = {}, options?: CommerceRequestOptions): Promise<PaymentListResponse> {
  return commerceGet<PaymentListResponse>("/payments", params, options);
}

/** Retrieves one payment by its documented UUID identifier. */
export function getPayment(paymentId: string, options?: CommerceRequestOptions): Promise<PaymentResponse> {
  return commerceGet<PaymentResponse>(`/payments/${commercePathSegment(paymentId, "paymentId")}`, undefined, options);
}

/** Retrieves the gateway transaction history whose deployed schema is unconstrained JSON. */
export function getPaymentGatewayTransactions(paymentId: string, options?: CommerceRequestOptions): Promise<PaymentGatewayTransactionHistory> {
  return commerceGet<PaymentGatewayTransactionHistory>(`/payments/${commercePathSegment(paymentId, "paymentId")}/transactions`, undefined, options);
}
