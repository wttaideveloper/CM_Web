"use client";

import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, getPayment, getPaymentGatewayTransactions, type PaymentResponse } from "@ihp/commerce";
import { useTranslation } from "react-i18next";

import { assertEnterprisePaymentTenant, enterprisePaymentQueryKeys, enterprisePaymentStatusLabel, formatEnterprisePaymentAmount, formatEnterprisePaymentDate, redactGatewayHistory } from "@/lib/enterprise-payments";

const ENTERPRISE_COMMERCE_REQUEST = { baseUrl: "/api/enterprise-commerce" } as const;

type EnterprisePaymentDetailsPanelProps = {
  accountId: string;
  tenantId: string;
  enterpriseId: string;
  paymentId: string;
  onClose: () => void;
};

/** Displays read-only Payment details and gateway history for the authenticated Enterprise. */
export default function EnterprisePaymentDetailsPanel({ accountId, tenantId, enterpriseId, paymentId, onClose }: EnterprisePaymentDetailsPanelProps) {
  const { t } = useTranslation("enterpriseFinance");
  const keys = enterprisePaymentQueryKeys(accountId, tenantId, enterpriseId);
  const paymentQuery = useQuery({
    queryKey: keys.detail(paymentId),
    queryFn: async () => assertEnterprisePaymentTenant(await getPayment(paymentId, ENTERPRISE_COMMERCE_REQUEST), tenantId),
    staleTime: 15_000,
    retry: (failureCount, error) => !(error instanceof CommerceApiError && [401, 403, 404].includes(error.status)) && failureCount < 1,
  });
  const historyQuery = useQuery({
    queryKey: keys.history(paymentId),
    queryFn: () => getPaymentGatewayTransactions(paymentId, ENTERPRISE_COMMERCE_REQUEST),
    staleTime: 15_000,
    retry: (failureCount, error) => !(error instanceof CommerceApiError && [401, 403, 404].includes(error.status)) && failureCount < 1,
  });

  return (
    <aside aria-label={t("details")} className="space-y-5 rounded-2xl border border-[#d7e5df] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-[#06201c]">{t("details")}</h2><p className="mt-1 break-all text-xs text-[#52736a]">{paymentId}</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-[#d7e5df] px-3 py-2 text-sm font-semibold text-[#31594d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">{t("closeDetails")}</button>
      </div>

      {paymentQuery.isLoading ? <p role="status" className="text-sm text-[#52736a]">{t("detailLoading")}</p> : null}
      {paymentQuery.isError ? <ErrorState message={errorMessage(paymentQuery.error, t("detailError"), t("signIn"), t("forbidden"))} onRetry={() => void paymentQuery.refetch()} retryLabel={t("retry")} /> : null}
      {paymentQuery.data ? <PaymentFields payment={paymentQuery.data} /> : null}

      <section aria-labelledby="enterprise-gateway-history-heading" className="border-t border-[#edf3f0] pt-4">
        <h3 id="enterprise-gateway-history-heading" className="text-base font-bold text-[#06201c]">{t("history")}</h3>
        {historyQuery.isLoading ? <p role="status" className="mt-3 text-sm text-[#52736a]">{t("historyLoading")}</p> : null}
        {historyQuery.isError ? <ErrorState message={errorMessage(historyQuery.error, t("historyError"), t("signIn"), t("forbidden"))} onRetry={() => void historyQuery.refetch()} retryLabel={t("retry")} /> : null}
        {historyQuery.data !== undefined ? <GatewayHistory value={redactGatewayHistory(historyQuery.data)} emptyLabel={t("noHistory")} /> : null}
      </section>
    </aside>
  );
}

function PaymentFields({ payment }: { payment: PaymentResponse }) {
  const { t } = useTranslation("enterpriseFinance");
  const fields: readonly [string, string][] = [
    [t("paymentStatus"), enterprisePaymentStatusLabel(payment.status, payment.status_label)],
    [t("purchaseTypeLabel"), payment.purchase_type || t("noValue")],
    [t("purchaseId"), payment.purchase_id || t("noValue")],
    [t("customerEmail"), payment.customer_email || t("noValue")],
    [t("customerId"), payment.customer_user_id || t("noValue")],
    [t("provider"), payment.provider || t("noValue")],
    [t("attempt"), String(payment.attempt_no)],
    [t("retryOf"), payment.retry_of_id || t("noValue")],
    [t("itemCurrency"), payment.item_currency || t("noValue")],
    [t("subtotal"), formatEnterprisePaymentAmount(payment.subtotal_amount, payment.item_currency)],
    [t("tax"), formatEnterprisePaymentAmount(payment.tax_amount, payment.item_currency)],
    [t("total"), formatEnterprisePaymentAmount(payment.total_amount, payment.item_currency)],
    [t("chargeCurrency"), payment.charge_currency || t("noValue")],
    [t("chargeSubtotal"), formatEnterprisePaymentAmount(payment.charge_subtotal, payment.charge_currency)],
    [t("chargeTax"), formatEnterprisePaymentAmount(payment.charge_tax, payment.charge_currency)],
    [t("chargeTotal"), formatEnterprisePaymentAmount(payment.charge_total, payment.charge_currency)],
    [t("exchangeRate"), payment.exchange_rate || t("noValue")],
    [t("baseAmount"), formatEnterprisePaymentAmount(payment.base_total, payment.base_currency)],
    [t("refunded"), formatEnterprisePaymentAmount(payment.refunded_amount, payment.charge_currency)],
    [t("refundable"), formatEnterprisePaymentAmount(payment.refundable_amount, payment.charge_currency)],
    [t("method"), payment.method_brand || t("noValue")],
    [t("methodLastFour"), payment.method_last4 ? `•••• ${payment.method_last4}` : t("noValue")],
    [t("createdAt"), formatEnterprisePaymentDate(payment.created_at)],
    [t("updatedAt"), formatEnterprisePaymentDate(payment.updated_at)],
  ];
  return <div className="space-y-5">
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold text-[#52736a]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#06201c]">{value}</dd></div>)}</dl>
    <section aria-labelledby="enterprise-tax-breakdown-heading"><h3 id="enterprise-tax-breakdown-heading" className="font-bold text-[#06201c]">{t("taxBreakdown")}</h3>
      {payment.tax_breakdown.length ? <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-xs"><thead><tr>{[t("taxType"), t("taxName"), t("taxRate"), t("jurisdiction"), t("taxableAmount"), t("taxAmount")].map((label) => <th key={label} className="border-b border-[#e1ebe6] px-2 py-2">{label}</th>)}</tr></thead><tbody>{payment.tax_breakdown.map((row, index) => <tr key={`${row.tax_type}-${row.name}-${index}`}><td className="px-2 py-2">{row.tax_type}</td><td className="px-2 py-2">{row.name}</td><td className="px-2 py-2">{row.rate}</td><td className="px-2 py-2">{[row.country, row.state].filter(Boolean).join(" · ")}</td><td className="px-2 py-2">{formatEnterprisePaymentAmount(row.taxable_amount, payment.item_currency)}</td><td className="px-2 py-2">{formatEnterprisePaymentAmount(row.tax_amount, payment.item_currency)}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-[#52736a]">{t("noValue")}</p>}
    </section>
    {payment.actions?.length ? <section><h3 className="font-bold text-[#06201c]">{t("availableActions")}</h3><ul className="mt-2 list-inside list-disc text-sm text-[#52736a]">{payment.actions.map((action, index) => <li key={`${action}-${index}`}>{action.replace(/[_-]+/g, " ")}</li>)}</ul></section> : null}
  </div>;
}

function GatewayHistory({ value, emptyLabel }: { value: unknown; emptyLabel: string }) {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)) {
    return <p className="mt-2 text-sm text-[#52736a]">{emptyLabel}</p>;
  }
  return <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#e1ebe6] bg-[#fbfdfc] p-3 text-xs text-[#31594d]">{JSON.stringify(value, null, 2)}</pre>;
}

function ErrorState({ message, onRetry, retryLabel }: { message: string; onRetry: () => void; retryLabel: string }) {
  return <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#8f3b2f]"><span>{message}</span><button type="button" onClick={onRetry} className="rounded-lg border border-[#d8a7a0] px-3 py-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{retryLabel}</button></div>;
}

function errorMessage(error: unknown, fallback: string, unauthorized: string, forbidden: string): string {
  if (error instanceof CommerceApiError && error.status === 401) return unauthorized;
  if (error instanceof CommerceApiError && error.status === 403) return forbidden;
  return fallback;
}
