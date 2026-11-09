"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { listPayments, type PaymentResponse } from "@ihp/commerce";
import { platformCommerceRequest } from "@/lib/platform-commerce-client";

import PlatformTransactionDetailsPanel from "./PlatformTransactionDetailsPanel";
import {
  buildPaymentListParams,
  getPaymentCustomerReference,
  getPaymentEnterpriseReference,
  getPaymentModule,
  getPaymentStatusLabel,
  getTransactionActionLabel,
  getTransactionStatusLabel,
  transactionFiltersFromQuery,
  transactionStatuses,
  type TransactionFilterValues,
} from "./platform-transactions";

const PAGE_SIZE = 25;
const defaultFilters = transactionFiltersFromQuery({ get: () => null });

/** Renders backend-authoritative, read-only payment history for Super Admins. */
export default function PlatformTransactionsLiveScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(() => transactionFiltersFromQuery(searchParams), [searchParams]);
  const page = parsePage(searchParams.get("page"));
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const listParams = useMemo(() => buildPaymentListParams(filters, page, PAGE_SIZE), [filters, page]);
  const paymentsQuery = useQuery({
    queryKey: ["commerce", "payments", listParams],
    queryFn: () => listPayments(listParams, platformCommerceRequest),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });

  const syncFilters = (nextFilters: TransactionFilterValues, nextPage = 1) => {
    const query = new URLSearchParams(queryString);
    const values: Record<string, string> = {
      search: nextFilters.search,
      enterprise: nextFilters.enterprise,
      module: nextFilters.module,
      currency: nextFilters.currency,
      status: nextFilters.status === "all" ? "" : nextFilters.status,
      from: nextFilters.from,
      to: nextFilters.to,
      page: nextPage > 1 ? String(nextPage) : "",
    };

    for (const [key, value] of Object.entries(values)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    query.delete("payment_status");
    const nextQuery = query.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const updateFilter = (key: keyof TransactionFilterValues, value: string) => {
    syncFilters({ ...filters, [key]: value } as TransactionFilterValues);
  };

  return (
    <div className="space-y-5" aria-labelledby="transactions-page-title">
      <h2 id="transactions-page-title" className="sr-only">Transactions</h2>
      <FilterBar filters={filters} onChange={updateFilter} onReset={() => syncFilters(defaultFilters)} />
      {paymentsQuery.isPending && !paymentsQuery.data ? <LoadingState /> : null}
      {paymentsQuery.isError ? <ErrorState error={paymentsQuery.error} onRetry={() => paymentsQuery.refetch()} isRetrying={paymentsQuery.isFetching} /> : null}
      {paymentsQuery.data ? <TransactionTable payments={paymentsQuery.data.items} page={paymentsQuery.data.page} pageSize={paymentsQuery.data.page_size || PAGE_SIZE} total={paymentsQuery.data.total} isFetching={paymentsQuery.isFetching} onPageChange={(nextPage) => syncFilters(filters, nextPage)} onSelect={setSelectedPaymentId} /> : null}
      {selectedPaymentId ? <PlatformTransactionDetailsPanel paymentId={selectedPaymentId} onClose={() => setSelectedPaymentId(null)} /> : null}
      <p className="text-xs leading-5 text-[#7f9d94]">Payment data is read-only in this phase. Financial actions remain disabled even when the backend supplies them in the actions array.</p>
    </div>
  );
}

function FilterBar({ filters, onChange, onReset }: { filters: TransactionFilterValues; onChange: (key: keyof TransactionFilterValues, value: string) => void; onReset: () => void }) {
  const hasFilters = Object.values(filters).some((value) => value && value !== "all");
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="transaction-filters-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 id="transaction-filters-title" className="text-base font-bold text-[#06201c]">Filter transactions</h2><p className="mt-1 text-sm text-[#52736a]">Filters sent to the Payments API are tenant ID, currency, status and date range.</p></div>
        <button type="button" disabled={!hasFilters} onClick={onReset} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-45">Reset filters</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-[#31594d]">Search transaction or customer<input type="search" value={filters.search} disabled aria-describedby="transaction-filter-note" onChange={(event) => onChange("search", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] disabled:cursor-not-allowed disabled:bg-[#f4f7f5]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Enterprise / tenant ID<input type="search" value={filters.enterprise} onChange={(event) => onChange("enterprise", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Module<select value={filters.module} disabled aria-describedby="transaction-filter-note" onChange={(event) => onChange("module", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c] disabled:cursor-not-allowed disabled:bg-[#f4f7f5]"><option value="">All modules</option><option value="Products">Products</option><option value="Services">Services</option><option value="Events">Events</option><option value="Trainings">Trainings</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">Currency<input value={filters.currency} onChange={(event) => onChange("currency", event.target.value.toUpperCase())} maxLength={3} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal uppercase text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Status<select value={filters.status} onChange={(event) => onChange("status", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="all">All statuses</option>{filters.status !== "all" && !transactionStatuses.includes(filters.status as typeof transactionStatuses[number]) ? <option value={filters.status}>{getTransactionStatusLabel(filters.status)}</option> : null}{transactionStatuses.map((status) => <option key={status} value={status}>{getTransactionStatusLabel(status)}</option>)}</select></label>
        <label className="text-sm font-semibold text-[#31594d]">From<input type="date" value={filters.from} onChange={(event) => onChange("from", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">To<input type="date" value={filters.to} onChange={(event) => onChange("to", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
      </div>
      <p id="transaction-filter-note" className="mt-3 text-xs text-[#7f9d94]">Customer search and module filtering are disabled until the Payments API documents corresponding list parameters. No partial-page local filtering is applied.</p>
    </section>
  );
}

function TransactionTable({ payments, page, pageSize, total, isFetching, onPageChange, onSelect }: { payments: readonly PaymentResponse[]; page: number; pageSize: number; total: number; isFetching: boolean; onPageChange: (nextPage: number) => void; onSelect: (paymentId: string) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="transactions-table-title" aria-busy={isFetching}>
      <div className="border-b border-[#edf3f0] p-5"><h2 id="transactions-table-title" className="text-lg font-bold text-[#06201c]">Transactions</h2><p className="mt-1 text-sm text-[#52736a]">Backend-authoritative payment records. Completed amounts are read-only and remain separated by currency.</p>{isFetching ? <p className="mt-1 text-xs text-[#7f9d94]" role="status">Refreshing payment history...</p> : null}</div>
      <div className="overflow-x-auto"><table className="min-w-[1450px] w-full text-left text-sm"><caption className="sr-only">Commerce transactions</caption><thead className="border-b border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.08em] text-[#52736a]"><tr><th className="px-5 py-3">Payment ID</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Enterprise / tenant</th><th className="px-5 py-3">Purchase type</th><th className="px-5 py-3">Original amount</th><th className="px-5 py-3">Charged amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Gateway</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{payments.length === 0 ? <tr><td colSpan={10} className="px-5 py-12 text-center"><p className="font-semibold text-[#06201c]">No payments found</p><p className="mt-1 text-sm text-[#52736a]">The Payments API returned an empty page for these filters.</p></td></tr> : payments.map((payment) => <PaymentRow key={payment.id} payment={payment} onSelect={onSelect} />)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-[#edf3f0] p-4 text-sm text-[#52736a]"><span>Page {page} · {total} records</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || isFetching} onClick={() => onPageChange(page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">Previous</button><button type="button" disabled={page >= pageCount || isFetching} onClick={() => onPageChange(page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">Next</button></div></div>
    </section>
  );
}

function PaymentRow({ payment, onSelect }: { payment: PaymentResponse; onSelect: (paymentId: string) => void }) {
  const actions = payment.actions ?? [];
  return <tr className="border-b border-[#edf3f0]"><td className="break-all px-5 py-3 font-semibold text-[#06201c]">{payment.id}</td><td className="px-5 py-3">{getPaymentCustomerReference(payment)}</td><td className="px-5 py-3">{getPaymentEnterpriseReference(payment)}</td><td className="px-5 py-3">{getPaymentModule(payment)}</td><td className="px-5 py-3">{payment.total_amount} {payment.item_currency}</td><td className="px-5 py-3">{payment.charge_total} {payment.charge_currency}</td><td className="px-5 py-3"><span className="inline-flex rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-bold text-[#31594d]">{getPaymentStatusLabel(payment)}</span></td><td className="px-5 py-3">{payment.provider}</td><td className="whitespace-nowrap px-5 py-3">{payment.created_at}</td><td className="px-5 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onSelect(payment.id)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">View details</button>{actions.filter((action) => action !== "view_details").map((action) => <button key={action} type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{getTransactionActionLabel(action)}</button>)}</div></td></tr>;
}

function LoadingState() {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm" aria-live="polite" role="status"><p className="text-sm font-semibold text-[#52736a]">Loading transactions...</p></section>;
}

function ErrorState({ error, onRetry, isRetrying }: { error: unknown; onRetry: () => void; isRetrying: boolean }) {
  return <section className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] p-6 shadow-sm" role="alert"><p className="text-sm font-semibold text-[#b42318]">Transactions could not be loaded: {getRequestErrorMessage(error)}</p><button type="button" onClick={onRetry} disabled={isRetrying} className="mt-3 rounded-full border border-[#e7b8b2] px-3 py-1.5 text-xs font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">{isRetrying ? "Retrying..." : "Retry"}</button></section>;
}

function getRequestErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to load the backend response.";
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
