"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getRefund, listRefunds, type RefundResponse } from "@ihp/commerce";
import { platformCommerceRequest } from "@/lib/platform-commerce-client";

import { buildRefundListParams, getRefundPagination, refundActionLabel, type RefundListFilters } from "./platform-refunds-live";

const PAGE_SIZE = 20;
const initialFilters: RefundListFilters = { status: "", paymentId: "", tenantId: "", overdue: "all", from: "", to: "" };
const card = "rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm";

/** Displays read-only, backend-authoritative refund history and detail data. */
export default function PlatformRefundsLiveScreen() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const params = useMemo(() => buildRefundListParams(filters, page, PAGE_SIZE), [filters, page]);
  const refundsQuery = useQuery({
    queryKey: ["platform-commerce", "refunds", params],
    queryFn: () => listRefunds(params, platformCommerceRequest),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
  const updateFilter = (key: keyof RefundListFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return <div className="space-y-5" aria-labelledby="refund-management-page-title">
    <h2 id="refund-management-page-title" className="sr-only">Refund Management</h2>
    <section className={card} aria-labelledby="refund-filters-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 id="refund-filters-title" className="text-base font-bold text-[#06201c]">Filter refunds</h2><p className="mt-1 text-sm text-[#52736a]">These filters are sent to the authenticated refund API. Refund amounts and eligibility remain backend-authoritative.</p></div>
        <button type="button" disabled={!Object.values(filters).some(Boolean)} onClick={() => { setFilters(initialFilters); setPage(1); }} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-45">Reset filters</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-[#31594d]">Payment ID<input value={filters.paymentId} onChange={(event) => updateFilter("paymentId", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Enterprise / tenant ID<input value={filters.tenantId} onChange={(event) => updateFilter("tenantId", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Status<input value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} placeholder="Backend status" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">Overdue<select value={filters.overdue} onChange={(event) => updateFilter("overdue", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c]"><option value="all">All refunds</option><option value="true">Overdue</option><option value="false">Not overdue</option></select></label>
        <label className="text-sm font-semibold text-[#31594d]">From (UTC date)<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
        <label className="text-sm font-semibold text-[#31594d]">To (UTC date)<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c]" /></label>
      </div>
      <p className="mt-3 text-xs text-[#7f9d94]">Customer, module, currency and refund-ID search are not available as list filters in the deployed API and are not simulated locally.</p>
    </section>

    {refundsQuery.isPending && !refundsQuery.data ? <section className={card} role="status" aria-live="polite">Loading refunds...</section> : null}
    {refundsQuery.isError ? <RequestError error={refundsQuery.error} retry={() => void refundsQuery.refetch()} busy={refundsQuery.isFetching} label="Refund history" /> : null}
    {refundsQuery.data ? <RefundListTable data={refundsQuery.data} requestedPage={page} isFetching={refundsQuery.isFetching} onPage={setPage} onSelect={setSelectedRefundId} /> : null}
    {selectedRefundId ? <RefundDetailPanel refundId={selectedRefundId} onClose={() => setSelectedRefundId(null)} /> : <section className={card} aria-labelledby="refund-details-empty-title"><h2 id="refund-details-empty-title" className="text-lg font-bold text-[#06201c]">Refund details</h2><p className="mt-1 text-sm text-[#52736a]">Select a returned refund to load its authoritative details.</p></section>}
    <p className="text-xs leading-5 text-[#7f9d94]">Read-only integration. Refund creation, approval, rejection, retries, manual completion and other financial mutations are not called from this screen.</p>
  </div>;
}

function RefundListTable({ data, requestedPage, isFetching, onPage, onSelect }: { data: Awaited<ReturnType<typeof listRefunds>>; requestedPage: number; isFetching: boolean; onPage: (page: number) => void; onSelect: (id: string) => void }) {
  const pagination = getRefundPagination(data, requestedPage, PAGE_SIZE);
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="refund-table-title" aria-busy={isFetching}>
    <div className="border-b border-[#edf3f0] p-5"><h2 id="refund-table-title" className="text-lg font-bold text-[#06201c]">Refund requests</h2><p className="mt-1 text-sm text-[#52736a]">Backend refund records; amounts remain decimal strings and are never aggregated here.</p>{isFetching ? <p className="mt-1 text-xs text-[#7f9d94]" role="status">Refreshing refund history...</p> : null}</div>
    <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><caption className="sr-only">Backend refund records</caption><thead className="border-b border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.08em] text-[#52736a]"><tr><th className="px-5 py-3">Refund ID</th><th className="px-5 py-3">Payment ID</th><th className="px-5 py-3">Tenant ID</th><th className="px-5 py-3">Amount / currency</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Destination</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3">Overdue</th><th className="px-5 py-3">Actions</th></tr></thead>
      <tbody>{data.items.length === 0 ? <tr><td colSpan={10} className="px-5 py-12 text-center"><p className="font-semibold text-[#06201c]">No refund records found</p><p className="mt-1 text-sm text-[#52736a]">The backend returned no refund records for this page and filter set.</p></td></tr> : data.items.map((refund) => <tr key={refund.id} className="border-b border-[#edf3f0]"><td className="break-all px-5 py-3 font-semibold text-[#06201c]">{refund.id}</td><td className="break-all px-5 py-3">{refund.payment_id}</td><td className="break-all px-5 py-3">{refund.tenant_id || "Not supplied"}</td><td className="whitespace-nowrap px-5 py-3">{refund.amount} {refund.currency}</td><td className="px-5 py-3"><RefundStatus refund={refund} /></td><td className="px-5 py-3">{refund.refund_type}</td><td className="px-5 py-3">{refund.destination}</td><td className="whitespace-nowrap px-5 py-3">{refund.created_at}</td><td className="px-5 py-3">{refund.is_overdue === undefined ? "Not supplied" : refund.is_overdue ? "Yes" : "No"}</td><td className="px-5 py-3"><button type="button" onClick={() => onSelect(refund.id)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">View details</button></td></tr>)}</tbody>
    </table></div>
    <div className="flex items-center justify-between border-t border-[#edf3f0] p-4 text-sm text-[#52736a]"><span>Page {pagination.page} of {pagination.pageCount} · {pagination.total} records</span><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1 || isFetching} onClick={() => onPage(pagination.page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">Previous</button><button type="button" disabled={pagination.page >= pagination.pageCount || isFetching} onClick={() => onPage(pagination.page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-45">Next</button></div></div>
  </section>;
}

function RefundStatus({ refund }: { refund: RefundResponse }) {
  return <span className="inline-flex rounded-full bg-[#f1f5f3] px-3 py-1 text-xs font-bold text-[#31594d]">{refund.status_label || refund.status}</span>;
}

function RefundDetailPanel({ refundId, onClose }: { refundId: string; onClose: () => void }) {
  const query = useQuery({ queryKey: ["platform-commerce", "refunds", "detail", refundId], queryFn: () => getRefund(refundId, platformCommerceRequest), enabled: Boolean(refundId), retry: false, staleTime: 30_000 });
  return <section className={card} role="region" aria-labelledby="refund-detail-title" aria-busy={query.isFetching}>
    <div className="flex items-start justify-between gap-3"><div><h2 id="refund-detail-title" className="text-lg font-bold text-[#06201c]">Refund details</h2><p className="mt-1 break-all text-sm text-[#52736a]">Refund {refundId}</p></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold text-[#52736a]">Close</button></div>
    {query.isPending ? <p className="mt-4 text-sm text-[#52736a]" role="status">Loading refund details...</p> : null}
    {query.isError ? <RequestError error={query.error} retry={() => void query.refetch()} busy={query.isFetching} label="Refund details" /> : null}
    {query.data ? <RefundDetail refund={query.data} /> : null}
  </section>;
}

function RefundDetail({ refund }: { refund: RefundResponse }) {
  const fields: readonly [string, string][] = [
    ["Refund ID", refund.id], ["Original payment ID", refund.payment_id], ["Tenant ID", refund.tenant_id ?? "Not supplied"],
    ["Status", refund.status_label || refund.status], ["Refund type", refund.refund_type], ["Amount / currency", `${refund.amount} ${refund.currency}`],
    ["Destination", refund.destination], ["Reason", refund.reason ?? "Not supplied"], ["Decision reason", refund.decision_reason ?? "Not supplied"],
    ["Tax refunded", refund.tax_refunded], ["Bank reference", refund.bank_reference ?? "Not supplied"], ["Gateway failure reason", refund.failure_reason ?? "Not supplied"],
    ["Credit note ID", refund.credit_note_id ?? "Not supplied"], ["Requested by role", refund.requested_by_role ?? "Not supplied"],
    ["Created at", refund.created_at], ["Decided at", refund.decided_at ?? "Not supplied"], ["Approved at", refund.approved_at ?? "Not supplied"],
    ["Completed at", refund.completed_at ?? "Not supplied"], ["SLA due at", refund.sla_due_at ?? "Not supplied"],
    ["Overdue", refund.is_overdue === undefined ? "Not supplied" : refund.is_overdue ? "Yes" : "No"], ["Escalated at", refund.escalated_at ?? "Not supplied"],
  ];
  return <>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label, value]) => <div key={label} className="rounded-xl border border-[#edf3f0] bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">{label}</dt><dd className="mt-1 break-words text-sm text-[#31594d]">{value}</dd></div>)}</dl>
    <section className="mt-5 border-t border-[#d7e5df] pt-4" aria-labelledby="refund-actions-title"><h3 id="refund-actions-title" className="font-bold text-[#06201c]">Backend-provided actions</h3><p className="mt-1 text-sm text-[#52736a]">Actions are displayed only when supplied by the backend. All refund mutations are disabled in this integration.</p>{refund.actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{refund.actions.map((action, index) => <button key={`${action}-${index}`} type="button" disabled title="Refund mutations are unavailable in this read-only phase" className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-50">{refundActionLabel(action)}</button>)}</div> : <p className="mt-3 text-sm text-[#7f9d94]">No additional actions were supplied.</p>}</section>
  </>;
}

function RequestError({ error, retry, busy, label }: { error: unknown; retry: () => void; busy: boolean; label: string }) {
  const message = error instanceof Error ? error.message : "Unable to load the backend response.";
  return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm font-semibold text-[#b42318]">{label} could not be loaded: {message}</p><button type="button" onClick={retry} disabled={busy} className="mt-3 rounded-full border border-[#e7b8b2] px-3 py-1.5 text-xs font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Retrying..." : "Retry"}</button></div>;
}
