"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CommerceApiError,
  getPayment,
  getPaymentGatewayTransactions,
  type CommerceJsonValue,
  type PaymentResponse,
} from "@ihp/commerce";

import { getPaymentStatusLabel, getTransactionActionLabel } from "./platform-transactions";
import { platformCommerceRequest } from "@/lib/platform-commerce-client";

type PlatformTransactionDetailsPanelProps = {
  paymentId: string;
  onClose: () => void;
};

/** Loads and displays read-only payment and gateway details for a selected payment. */
export default function PlatformTransactionDetailsPanel({ paymentId, onClose }: PlatformTransactionDetailsPanelProps) {
  const paymentQuery = useQuery({
    queryKey: ["commerce", "payment", paymentId],
    queryFn: () => getPayment(paymentId, platformCommerceRequest),
    enabled: Boolean(paymentId),
    retry: false,
    staleTime: 30_000,
  });
  const gatewayQuery = useQuery({
    queryKey: ["commerce", "payment", paymentId, "gateway-transactions"],
    queryFn: () => getPaymentGatewayTransactions(paymentId, platformCommerceRequest),
    enabled: Boolean(paymentId),
    retry: false,
    staleTime: 30_000,
  });

  return (
    <section className="mt-5 rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] p-5" aria-labelledby="transaction-details-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="transaction-details-title" className="text-lg font-bold text-[#06201c]">Transaction details</h2>
          <p className="mt-1 break-all text-sm text-[#52736a]">Payment ID: {paymentId}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a]">Close</button>
      </div>

      <div className="mt-4 space-y-4">
        {paymentQuery.isPending ? <LoadingBlock label="Loading payment details..." /> : null}
        {paymentQuery.isError ? <ErrorBlock error={paymentQuery.error} onRetry={() => paymentQuery.refetch()} label="Payment details" isRetrying={paymentQuery.isFetching} /> : null}
        {paymentQuery.data ? <PaymentDetails payment={paymentQuery.data} /> : null}

        {gatewayQuery.isPending ? <LoadingBlock label="Loading gateway transaction history..." /> : null}
        {gatewayQuery.isError ? <ErrorBlock error={gatewayQuery.error} onRetry={() => gatewayQuery.refetch()} label="Gateway transaction history" isRetrying={gatewayQuery.isFetching} /> : null}
        {gatewayQuery.data !== undefined && !gatewayQuery.isError ? <GatewayHistory value={gatewayQuery.data} /> : null}
      </div>
    </section>
  );
}

function PaymentDetails({ payment }: { payment: PaymentResponse }) {
  const fields = [
    ["Status", getPaymentStatusLabel(payment)],
    ["Purchase type", payment.purchase_type],
    ["Purchase reference", payment.purchase_id],
    ["Customer reference", payment.customer_email ?? payment.customer_user_id ?? "Not supplied"],
    ["Enterprise / tenant", payment.tenant_id ?? "Not supplied"],
    ["Original amount", `${payment.total_amount} ${payment.item_currency}`],
    ["Charged amount", `${payment.charge_total} ${payment.charge_currency}`],
    ["Base-currency amount", `${payment.base_total} ${payment.base_currency}`],
    ["Exchange rate", payment.exchange_rate],
    ["Refunded amount", `${payment.refunded_amount} ${payment.charge_currency}`],
    ["Refundable amount", `${payment.refundable_amount} ${payment.charge_currency}`],
    ["Gateway / provider", payment.provider],
    ["Payment attempt", String(payment.attempt_no)],
    ["Invoice reference", payment.invoice_id ?? "Not supplied"],
    ["Created at", payment.created_at],
  ] as const;

  return (
    <div className="space-y-4">
      <section aria-labelledby="payment-summary-title">
        <h3 id="payment-summary-title" className="text-sm font-bold uppercase tracking-wide text-[#52736a]">Payment summary</h3>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => <DetailField key={label} label={label} value={value} />)}
        </dl>
      </section>

      <section aria-labelledby="payment-actions-title">
        <h3 id="payment-actions-title" className="text-sm font-bold uppercase tracking-wide text-[#52736a]">Backend-provided actions</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(payment.actions ?? []).length === 0 ? <p className="text-sm text-[#52736a]">No actions were supplied.</p> : null}
          {(payment.actions ?? []).map((action) => <button key={action} type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-60">{getTransactionActionLabel(action)}</button>)}
        </div>
      </section>

      <TaxBreakdown payment={payment} />
      <PaymentLines payment={payment} />
    </div>
  );
}

function TaxBreakdown({ payment }: { payment: PaymentResponse }) {
  return (
    <section aria-labelledby="payment-tax-title">
      <h3 id="payment-tax-title" className="text-sm font-bold uppercase tracking-wide text-[#52736a]">Tax breakdown</h3>
      {payment.tax_breakdown.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">No tax lines supplied.</p> : <div className="mt-2 overflow-x-auto rounded-xl border border-[#edf3f0] bg-white"><table className="min-w-[620px] w-full text-left text-sm"><caption className="sr-only">Tax breakdown for payment {payment.id}</caption><thead className="border-b border-[#edf3f0] text-xs uppercase text-[#52736a]"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Rate</th><th className="px-3 py-2">Taxable amount</th><th className="px-3 py-2">Tax amount</th></tr></thead><tbody>{payment.tax_breakdown.map((line, index) => <tr key={`${line.tax_type}-${line.name}-${index}`} className="border-b border-[#edf3f0]"><td className="px-3 py-2">{line.tax_type}</td><td className="px-3 py-2">{line.name}</td><td className="px-3 py-2">{line.rate}</td><td className="px-3 py-2">{line.taxable_amount} {payment.item_currency}</td><td className="px-3 py-2">{line.tax_amount} {payment.item_currency}</td></tr>)}</tbody></table></div>}
    </section>
  );
}

function PaymentLines({ payment }: { payment: PaymentResponse }) {
  return (
    <section aria-labelledby="payment-lines-title">
      <h3 id="payment-lines-title" className="text-sm font-bold uppercase tracking-wide text-[#52736a]">Payment lines</h3>
      {payment.lines.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">No payment lines supplied.</p> : <div className="mt-2 space-y-2">{payment.lines.map((line) => <div key={line.ref} className="rounded-xl border border-[#edf3f0] bg-white p-3"><p className="font-semibold text-[#06201c]">{line.description}</p><p className="mt-1 text-sm text-[#52736a]">{line.quantity} × {line.unit_amount} {payment.item_currency} · Gross {line.gross_amount} {payment.item_currency}</p></div>)}</div>}
    </section>
  );
}

function GatewayHistory({ value }: { value: CommerceJsonValue }) {
  return <section aria-labelledby="gateway-history-title"><h3 id="gateway-history-title" className="text-sm font-bold uppercase tracking-wide text-[#52736a]">Gateway transaction history</h3><pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-[#edf3f0] bg-white p-3 text-xs leading-5 text-[#31594d]">{JSON.stringify(value, null, 2)}</pre></section>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</dt><dd className="mt-1 break-words text-sm text-[#31594d]">{value || "Not supplied"}</dd></div>;
}

function LoadingBlock({ label }: { label: string }) {
  return <p className="rounded-xl border border-[#d7e5df] bg-white p-4 text-sm font-semibold text-[#52736a]" role="status">{label}</p>;
}

function ErrorBlock({ error, onRetry, label, isRetrying }: { error: unknown; onRetry: () => void; label: string; isRetrying: boolean }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm font-semibold text-[#b42318]">{label} failed: {getRequestErrorMessage(error)}</p><button type="button" onClick={onRetry} disabled={isRetrying} className="mt-3 rounded-full border border-[#e7b8b2] px-3 py-1.5 text-xs font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">{isRetrying ? "Retrying..." : "Retry"}</button></div>;
}

function getRequestErrorMessage(error: unknown): string {
  if (error instanceof CommerceApiError) return `${error.status} · ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unable to load the backend response.";
}
