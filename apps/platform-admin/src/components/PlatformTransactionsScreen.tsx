"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getTransactionActionLabel,
  getTransactionStatusLabel,
  filterTransactions,
  transactionFiltersFromQuery,
  transactionPreviews,
  transactionStatuses,
  type TransactionFilterValues,
  type TransactionPreview,
  type TransactionStatus,
} from "./platform-transactions";

type TransactionFilters = TransactionFilterValues;

const defaultFilters: TransactionFilters = transactionFiltersFromQuery({ get: () => null });

function StatusBadge({ status }: { status: TransactionStatus }) {
  return <span className="inline-flex rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-bold text-[#31594d]">{getTransactionStatusLabel(status)}</span>;
}

function TransactionDetailsPanel({ transaction, onClose }: { transaction: TransactionPreview; onClose: () => void }) {
  const details = [
    ["Customer / enterprise", `${transaction.customer} / ${transaction.enterprise}`],
    ["Purchased offering", transaction.offering],
    ["Purchase type", transaction.module],
    ["Original selling amount", `${transaction.originalAmount} ${transaction.originalCurrency}`],
    ["Discount", transaction.discount],
    ["Tax breakdown", transaction.taxBreakdown],
    ["Applied exchange rate", transaction.exchangeRate],
    ["Final paid amount", `${transaction.paymentAmount} ${transaction.paymentCurrency}`],
    ["Gateway / reference", `${transaction.gateway} / ${transaction.gatewayReference}`],
    ["Payment attempt", transaction.paymentAttempt],
    ["Status history", transaction.statusHistory],
    ["Invoice / refund references", `${transaction.invoiceReference} / ${transaction.refundReference}`],
    ["Reconciliation", transaction.reconciliationStatus],
  ] as const;
  return <section className="mt-5 rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] p-5" role="dialog" aria-labelledby="transaction-details-title"><div className="flex items-start justify-between gap-3"><div><h2 id="transaction-details-title" className="text-lg font-bold text-[#06201c]">Transaction details</h2><p className="mt-1 text-sm text-[#52736a]">{transaction.id} · <StatusBadge status={transaction.status} /></p></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a]">Close</button></div><dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div key={label} className="rounded-xl border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</dt><dd className="mt-1 text-sm text-[#31594d]">{value}</dd></div>)}</dl></section>;
}

function FilterBar({ filters, onChange, onReset }: { filters: TransactionFilters; onChange: (key: keyof TransactionFilters, value: string) => void; onReset: () => void }) {
  const hasFilters = Object.values(filters).some((value) => value && value !== "all");
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="transaction-filters-title"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="transaction-filters-title" className="text-base font-bold text-[#06201c]">Filter transactions</h2><p className="mt-1 text-sm text-[#52736a]">Filters are ready for the Payments API; no local totals or currency conversion are performed.</p></div><button type="button" disabled={!hasFilters} onClick={onReset} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-45">Reset filters</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-semibold text-[#31594d]">Search transaction or customer<input type="search" value={filters.search} onChange={(event) => onChange("search", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">Enterprise<input type="search" value={filters.enterprise} onChange={(event) => onChange("enterprise", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">Module<select value={filters.module} onChange={(event) => onChange("module", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="">All modules</option><option value="Products">Products</option><option value="Services">Services</option><option value="Events">Events</option><option value="Trainings">Trainings</option></select></label><label className="text-sm font-semibold text-[#31594d]">Currency<input value={filters.currency} onChange={(event) => onChange("currency", event.target.value.toUpperCase())} maxLength={3} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal uppercase text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">Status<select value={filters.status} onChange={(event) => onChange("status", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="all">All statuses</option>{transactionStatuses.map((status) => <option key={status} value={status}>{getTransactionStatusLabel(status)}</option>)}</select></label><label className="text-sm font-semibold text-[#31594d]">From<input type="date" value={filters.from} onChange={(event) => onChange("from", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label><label className="text-sm font-semibold text-[#31594d]">To<input type="date" value={filters.to} onChange={(event) => onChange("to", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label></div></section>;
}

type TransactionListState = "loading" | "error" | "empty";

function TransactionTable({ transactions, page, state = "empty", onPageChange, onSelect }: { transactions: readonly TransactionPreview[]; page: number; state?: TransactionListState; onPageChange: (nextPage: number) => void; onSelect: (transaction: TransactionPreview) => void }) {
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize));
  const visibleTransactions = transactions.slice((page - 1) * pageSize, page * pageSize);
  if (state === "loading") return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm" aria-live="polite"><p className="text-sm font-semibold text-[#52736a]">Loading transactions...</p></section>;
  if (state === "error") return <section className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] p-6 shadow-sm" role="alert"><p className="text-sm font-semibold text-[#b42318]">Transactions are unavailable until the Payments API is connected.</p></section>;
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="transactions-table-title"><div className="border-b border-[#edf3f0] p-5"><h2 id="transactions-table-title" className="text-lg font-bold text-[#06201c]">Transactions</h2><p className="mt-1 text-sm text-[#52736a]">Completed amounts are read-only and remain separated by currency.</p></div><div className="overflow-x-auto"><table className="min-w-[1250px] w-full text-left text-sm"><caption className="sr-only">Commerce transactions</caption><thead className="border-b border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.08em] text-[#52736a]"><tr><th className="px-5 py-3">Transaction ID</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Enterprise</th><th className="px-5 py-3">Module</th><th className="px-5 py-3">Original amount</th><th className="px-5 py-3">Payment amount</th><th className="px-5 py-3">Payment status</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{visibleTransactions.length > 0 ? visibleTransactions.map((transaction) => <tr key={transaction.id} className="border-b border-[#edf3f0]"><td className="px-5 py-3 font-semibold text-[#06201c]">{transaction.id}</td><td className="px-5 py-3">{transaction.customer}</td><td className="px-5 py-3">{transaction.enterprise}</td><td className="px-5 py-3">{transaction.module}</td><td className="px-5 py-3">{transaction.originalAmount} {transaction.originalCurrency}</td><td className="px-5 py-3">{transaction.paymentAmount} {transaction.paymentCurrency}</td><td className="px-5 py-3"><StatusBadge status={transaction.status} /></td><td className="px-5 py-3">{transaction.date}</td><td className="flex flex-wrap gap-2 px-5 py-3"><button type="button" disabled={!transaction.actions.includes("view_details")} onClick={() => onSelect(transaction)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">{getTransactionActionLabel("view_details")}</button>{transaction.actions.filter((action) => action !== "view_details").map((action) => <button key={action} type="button" disabled className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{getTransactionActionLabel(action)}</button>)}</td></tr>) : <tr><td colSpan={9} className="px-5 py-12 text-center"><p className="font-semibold text-[#06201c]">No transactions available</p><p className="mt-1 text-sm text-[#52736a]">No authoritative financial records are loaded. Connect the documented Payments API before displaying transactions.</p></td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-[#edf3f0] p-4 text-sm text-[#52736a]"><span>Page {page} · {transactions.length} records</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">Next</button></div></div></section>;
}

export function LegacyPlatformTransactionsScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const filters = transactionFiltersFromQuery(searchParams);
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionPreview | null>(null);
  const transactions = useMemo(() => filterTransactions(transactionPreviews, filters), [filters]);

  const syncFilters = (nextFilters: TransactionFilters) => {
    const query = new URLSearchParams(queryString);
    const values: Record<string, string> = {
      search: nextFilters.search,
      enterprise: nextFilters.enterprise,
      module: nextFilters.module,
      currency: nextFilters.currency,
      status: nextFilters.status === "all" ? "" : nextFilters.status,
      from: nextFilters.from,
      to: nextFilters.to,
    };

    for (const [key, value] of Object.entries(values)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    query.delete("payment_status");
    const nextQuery = query.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const updateFilter = (key: keyof TransactionFilters, value: string) => {
    const nextFilters = { ...filters, [key]: value } as TransactionFilters;
    setPage(1);
    syncFilters(nextFilters);
  };

  const resetFilters = () => {
    setPage(1);
    syncFilters(defaultFilters);
  };

  return <div className="space-y-5" aria-labelledby="transactions-page-title"><h2 id="transactions-page-title" className="sr-only">Transactions</h2><FilterBar filters={filters} onChange={updateFilter} onReset={resetFilters} /><TransactionTable transactions={transactions} page={page} onPageChange={setPage} onSelect={setSelectedTransaction} />{selectedTransaction ? <TransactionDetailsPanel transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} /> : null}<p className="text-xs leading-5 text-[#7f9d94]">Capture, cancel, review resolution, refunds, invoice downloads and gateway transaction links will only be rendered from a backend-provided actions array. No payment mutation is available in this phase.</p></div>;
}

export { default } from "./PlatformTransactionsLiveScreen";
