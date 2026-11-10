"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommerceApiError, getCommerceOverview } from "@ihp/commerce";

import PlatformCurrenciesScreen from "./PlatformCurrenciesScreen";
import PlatformPaymentSettingsScreen from "./PlatformPaymentSettingsScreen";
import PlatformTaxManagementScreen from "./PlatformTaxManagementLiveScreen";
import PlatformTransactionsScreen from "./PlatformTransactionsScreen";
import PlatformRefundsLiveScreen from "./PlatformRefundsLiveScreen";
import PlatformInvoicesLiveScreen from "./PlatformInvoicesLiveScreen";
import PlatformSettlementsLiveScreen from "./PlatformSettlementsLiveScreen";
import PlatformReportsScreen from "./PlatformReportsLiveScreen";
import { buildOverviewQueryParams, formatMetricValue, getNeedsAttentionMetrics, getOverviewMetric } from "./platform-commerce-overview";
import { platformCommerceRequest } from "../lib/platform-commerce-client";
import type { PlatformCommerceSection } from "../lib/platform-commerce-routes";

type CommerceFilters = {
  from: string;
  to: string;
  enterprise: string;
};

const emptyFilters: CommerceFilters = { from: "", to: "", enterprise: "" };

const sections: Record<PlatformCommerceSection, { title: string; description: string }> = {
  overview: { title: "Commerce Overview", description: "Backend-authoritative platform commerce activity in the accounting base currency." },
  "payment-settings": { title: "Payment Settings", description: "Review the gateway configuration surface safely; persistence and connection controls require documented backend APIs." },
  currencies: { title: "Currencies & Exchange Rates", description: "Review the planned platform currency catalog and exchange-rate configuration surface." },
  tax: { title: "Tax Management", description: "Review backend-authoritative tax rules, rule versions, tax history and exemption records. Tax calculations and record mutations remain backend-only." },
  transactions: { title: "Transactions", description: "Review backend-authoritative payment history with read-only details and server-side filters." },
  refunds: { title: "Refund Management", description: "Review backend-authoritative refund requests and eligibility without performing refund mutations in this phase." },
  settlements: { title: "Merchant Settlements", description: "Review backend-authoritative settlements and payout operations without performing financial mutations in this phase." },
  invoices: { title: "Invoices", description: "Review backend-authoritative invoices and note workflows without generating or mutating financial documents in this phase." },
  reports: { title: "Reports & Audit", description: "Review report categories, reconciliation and finance audit surfaces without fabricating financial records." },
};

type OverviewKpi = {
  label: string;
  href: string;
  icon: string;
  category: "payments" | "refunds" | "tax" | "settlements";
  field: "paid" | "waiting" | "failed" | "total" | "pending" | "base_collected";
};

const kpis: readonly OverviewKpi[] = [
  { label: "Successful Payments", href: "/commerce/transactions?status=succeeded", icon: "✓", category: "payments", field: "paid" },
  { label: "Pending Payments", href: "/commerce/transactions?status=processing", icon: "…", category: "payments", field: "waiting" },
  { label: "Failed Payments", href: "/commerce/transactions?status=failed", icon: "!", category: "payments", field: "failed" },
  { label: "Total Refunds", href: "/commerce/refunds", icon: "↩", category: "refunds", field: "total" },
  { label: "Pending Settlements", href: "/commerce/settlements?status=pending", icon: "≡", category: "settlements", field: "pending" },
  { label: "Tax Collected", href: "/commerce/reports?metric=tax_collected", icon: "%", category: "tax", field: "base_collected" },
] as const;

function filtersFromQuery(query: { get: (key: string) => string | null }): CommerceFilters {
  return {
    from: query.get("from") ?? "",
    to: query.get("to") ?? "",
    enterprise: query.get("enterprise") ?? "",
  };
}

/** Renders the Phase 1 Super Admin commerce navigation and API-safe overview placeholders. */
export default function PlatformCommerceScreen({ section }: { section: PlatformCommerceSection }) {
  const activeSection = section;
  const meta = sections[activeSection];
  const searchParams = useSearchParams();

  return (
    <main className="w-full min-w-0 overflow-x-hidden bg-white px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7f9d94]">SUPER ADMIN · COMMERCE MANAGEMENT</p>
          <h1 className="mt-1 text-2xl font-bold text-[#06201c]">{meta.title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#52736a]">{meta.description}</p>
        </header>
        {activeSection === "overview" ? <CommerceOverview key={searchParams.toString()} /> : activeSection === "payment-settings" ? <PlatformPaymentSettingsScreen /> : activeSection === "currencies" ? <PlatformCurrenciesScreen /> : activeSection === "tax" ? <PlatformTaxManagementScreen /> : activeSection === "transactions" ? <PlatformTransactionsScreen /> : activeSection === "refunds" ? <PlatformRefundsLiveScreen /> : activeSection === "settlements" ? <PlatformSettlementsLiveScreen /> : activeSection === "invoices" ? <PlatformInvoicesLiveScreen /> : activeSection === "reports" ? <PlatformReportsScreen /> : <ComingSoonSection title={meta.title} />}
      </div>
    </main>
  );
}

function CommerceOverview() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<CommerceFilters>(() => filtersFromQuery(searchParams));
  const [appliedFilters, setAppliedFilters] = useState<CommerceFilters>(() => filtersFromQuery(searchParams));
  const queryParams = buildOverviewQueryParams(appliedFilters);
  const overviewQuery = useQuery({
    queryKey: ["platform-commerce", "overview", queryParams],
    queryFn: () => getCommerceOverview(queryParams, platformCommerceRequest),
    retry: false,
    staleTime: 30_000,
  });

  const syncFilters = (nextFilters: CommerceFilters) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) query.set(key, value);
    }
    const queryString = query.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const updateFilter = (key: keyof CommerceFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="commerce-filters-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 id="commerce-filters-title" className="text-base font-bold text-[#06201c]">Filter commerce activity</h2><p className="mt-1 text-sm text-[#52736a]">Only the supported date range and enterprise filters are sent to the overview API.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setAppliedFilters(filters); syncFilters(filters); }} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white hover:bg-[#195646]">Apply filters</button><button type="button" disabled={!hasFilters} onClick={() => { setFilters(emptyFilters); setAppliedFilters(emptyFilters); syncFilters(emptyFilters); }} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-45">Reset filters</button></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-semibold text-[#31594d]">From<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
          <label className="text-sm font-semibold text-[#31594d]">To<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
          <label className="text-sm font-semibold text-[#31594d]">Enterprise<input type="search" value={filters.enterprise} onChange={(event) => updateFilter("enterprise", event.target.value)} placeholder="Name or ID" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none placeholder:text-[#9eb0a9] focus:border-[#1f6a58]" /></label>
        </div>
      </section>

      {overviewQuery.isPending ? <RecentTransactions state="loading" /> : overviewQuery.error ? <OverviewError error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} /> : overviewQuery.data ? <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Commerce key performance indicators">
          {kpis.map((item) => {
            const metric = getOverviewMetric(overviewQuery.data, item.category, item.field);
            return <Link key={item.label} href={item.href} className="group rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d8ce] hover:shadow-md"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-lg font-bold text-[#1f6a58]">{item.icon}</span><span className="text-xs font-semibold text-[#7f9d94] group-hover:text-[#1f6a58]">View details →</span></div><p className="mt-5 text-2xl font-bold text-[#06201c]">{formatMetricValue(metric)}</p><h2 className="mt-1 text-sm font-semibold text-[#52736a]">{item.label}</h2></Link>;
          })}
        </section>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="commerce-needs-attention-title"><h2 id="commerce-needs-attention-title" className="text-lg font-bold text-[#06201c]">Needs attention</h2>{getNeedsAttentionMetrics(overviewQuery.data.needs_attention).length ? <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{getNeedsAttentionMetrics(overviewQuery.data.needs_attention).map((item) => <div key={item.label} className="rounded-xl border border-[#edf3f0] p-3"><dt className="text-xs font-semibold text-[#52736a]">{item.label}</dt><dd className="mt-1 text-xl font-bold text-[#06201c]">{item.value}</dd></div>)}</dl> : <p className="mt-1 text-sm text-[#52736a]">Not supplied</p>}</section>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="commerce-reporting-currency-title"><h2 id="commerce-reporting-currency-title" className="text-lg font-bold text-[#06201c]">Reporting currency</h2><p className="mt-1 text-sm text-[#52736a]">Backend-provided accounting base currency: <span className="font-semibold text-[#06201c]">{overviewQuery.data.base_currency || "Not supplied"}</span></p></section>
        <RecentTransactions state="empty" />
      </> : <RecentTransactions state="empty" />}
    </>
  );
}

function OverviewError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof CommerceApiError ? `${error.status} · ${error.message}` : "Commerce data is temporarily unavailable.";
  return <section className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] p-6 shadow-sm" role="alert"><p className="font-semibold text-[#b42318]">Unable to load Commerce overview</p><p className="mt-1 text-sm text-[#7f2f28]">{message}</p><button type="button" onClick={onRetry} className="mt-4 rounded-full border border-[#dba8a2] px-4 py-2 text-sm font-semibold text-[#9c2f24]">Retry</button></section>;
}

type TransactionViewState = "loading" | "error" | "empty";

function RecentTransactions({ state }: { state: TransactionViewState }) {
  if (state === "loading") {
    return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm" aria-live="polite"><p className="text-sm font-semibold text-[#52736a]">Loading transactions...</p></section>;
  }

  if (state === "error") {
    return <section className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] p-6 shadow-sm" role="alert"><p className="text-sm font-semibold text-[#b42318]">Transactions are unavailable until the Payments API is connected.</p></section>;
  }

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm" aria-labelledby="recent-transactions-title">
       <div className="flex flex-col gap-2 border-b border-[#edf3f0] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="recent-transactions-title" className="text-lg font-bold text-[#06201c]">Recent Transactions</h2><p className="mt-1 text-sm text-[#52736a]">The overview endpoint does not provide transaction rows. Use Transactions for the paginated payment history.</p></div><Link href="/commerce/transactions" className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58]">Open Transactions</Link></div>
       <div className="overflow-x-auto">
         <table className="min-w-[900px] w-full text-left text-sm"><thead className="border-b border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.08em] text-[#52736a]"><tr><th className="px-5 py-3">Transaction ID</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Enterprise</th><th className="px-5 py-3">Module</th><th className="px-5 py-3">Amount / Currency</th><th className="px-5 py-3">Payment Status</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Action</th></tr></thead><tbody><tr><td colSpan={8} className="px-5 py-12 text-center"><p className="font-semibold text-[#06201c]">No transaction rows in overview response</p><p className="mt-1 text-sm text-[#52736a]">Open Transactions to query backend-authoritative payment records.</p></td></tr></tbody></table>
      </div>
    </section>
  );
}

function ComingSoonSection({ title }: { title: string }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-8 text-center shadow-sm sm:p-12"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f6ee] text-2xl font-bold text-[#1f6a58]">◌</div><h2 className="mt-5 text-xl font-bold text-[#06201c]">{title} is coming soon</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#52736a]">This Phase 1 route is available for navigation, but its functional implementation will wait for the backend Payments, Currency, Tax, Invoice, Refund or Settlement contract.</p><Link href="/commerce" className="mt-5 inline-flex rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#195646]">Back to Commerce Overview</Link></section>;
}
