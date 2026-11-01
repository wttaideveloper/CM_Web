"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import PlatformCurrenciesScreen from "./PlatformCurrenciesScreen";
import PlatformPaymentSettingsScreen from "./PlatformPaymentSettingsScreen";
import PlatformTaxManagementScreen from "./PlatformTaxManagementScreen";
import PlatformTransactionsScreen from "./PlatformTransactionsScreen";
import PlatformRefundsScreen from "./PlatformRefundsScreen";
import PlatformSettlementsScreen from "./PlatformSettlementsScreen";
import PlatformInvoicesScreen from "./PlatformInvoicesScreen";
import PlatformReportsScreen from "./PlatformReportsScreen";
import type { PlatformCommerceSection } from "../lib/platform-commerce-routes";

type CommerceFilters = {
  from: string;
  to: string;
  enterprise: string;
  module: string;
  currency: string;
};

const emptyFilters: CommerceFilters = { from: "", to: "", enterprise: "", module: "", currency: "" };

const sections: Record<PlatformCommerceSection, { title: string; description: string }> = {
  overview: { title: "Commerce Overview", description: "A safe overview of platform commerce activity. Financial records will appear after the Payments APIs are connected." },
  "payment-settings": { title: "Payment Settings", description: "Review the gateway configuration surface safely; persistence and connection controls require documented backend APIs." },
  currencies: { title: "Currencies & Exchange Rates", description: "Review the planned platform currency catalog and exchange-rate configuration surface." },
  tax: { title: "Tax Management", description: "Review tax rules, classifications, exemptions and historical-version management safely; persistence requires documented backend contracts." },
  transactions: { title: "Transactions", description: "Review payment history without inventing financial records; transaction data requires the documented Payments API." },
  refunds: { title: "Refund Management", description: "Review backend-authoritative refund requests and eligibility without performing refund mutations in this phase." },
  settlements: { title: "Merchant Settlements", description: "Review backend-authoritative settlements and payout operations without performing financial mutations in this phase." },
  invoices: { title: "Invoices", description: "Review backend-authoritative invoices and note workflows without generating or mutating financial documents in this phase." },
  reports: { title: "Reports & Audit", description: "Review report categories, reconciliation and finance audit surfaces without fabricating financial records." },
};

const kpis = [
  { label: "Successful Payments", href: "/commerce/transactions?payment_status=successful", icon: "✓" },
  { label: "Pending Payments", href: "/commerce/transactions?payment_status=pending", icon: "…" },
  { label: "Failed Payments", href: "/commerce/transactions?payment_status=failed", icon: "!" },
  { label: "Total Refunds", href: "/commerce/refunds", icon: "↩" },
  { label: "Pending Settlements", href: "/commerce/settlements?status=pending", icon: "≡" },
  { label: "Tax Collected", href: "/commerce/reports?metric=tax_collected", icon: "%" },
] as const;

function filtersFromQuery(query: { get: (key: string) => string | null }): CommerceFilters {
  return {
    from: query.get("from") ?? "",
    to: query.get("to") ?? "",
    enterprise: query.get("enterprise") ?? "",
    module: query.get("module") ?? "",
    currency: query.get("currency") ?? "",
  };
}

/** Renders the Phase 1 Super Admin commerce navigation and API-safe overview placeholders. */
export default function PlatformCommerceScreen({ section }: { section: PlatformCommerceSection }) {
  const activeSection = section;
  const meta = sections[activeSection];

  return (
    <main className="w-full min-w-0 overflow-x-hidden bg-white px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7f9d94]">SUPER ADMIN · COMMERCE MANAGEMENT</p>
          <h1 className="mt-1 text-2xl font-bold text-[#06201c]">{meta.title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#52736a]">{meta.description}</p>
        </header>
        {activeSection === "overview" ? <CommerceOverview /> : activeSection === "payment-settings" ? <PlatformPaymentSettingsScreen /> : activeSection === "currencies" ? <PlatformCurrenciesScreen /> : activeSection === "tax" ? <PlatformTaxManagementScreen /> : activeSection === "transactions" ? <PlatformTransactionsScreen /> : activeSection === "refunds" ? <PlatformRefundsScreen /> : activeSection === "settlements" ? <PlatformSettlementsScreen /> : activeSection === "invoices" ? <PlatformInvoicesScreen /> : activeSection === "reports" ? <PlatformReportsScreen /> : <ComingSoonSection title={meta.title} />}
      </div>
    </main>
  );
}

function CommerceOverview() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<CommerceFilters>(() => filtersFromQuery(searchParams));

  const syncFilters = (nextFilters: CommerceFilters) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) query.set(key, value);
    }
    const queryString = query.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const updateFilter = (key: keyof CommerceFilters, value: string) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    syncFilters(nextFilters);
  };
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="commerce-filters-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 id="commerce-filters-title" className="text-base font-bold text-[#06201c]">Filter commerce activity</h2><p className="mt-1 text-sm text-[#52736a]">Filters are ready for the future reporting API and do not calculate financial values locally.</p></div>
          <button type="button" disabled={!hasFilters} onClick={() => { setFilters(emptyFilters); syncFilters(emptyFilters); }} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-45">Reset filters</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-semibold text-[#31594d]">From<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
          <label className="text-sm font-semibold text-[#31594d]">To<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
          <label className="text-sm font-semibold text-[#31594d]">Enterprise<input type="search" value={filters.enterprise} onChange={(event) => updateFilter("enterprise", event.target.value)} placeholder="Name or ID" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal text-[#06201c] outline-none placeholder:text-[#9eb0a9] focus:border-[#1f6a58]" /></label>
          <label className="text-sm font-semibold text-[#31594d]">Module<select value={filters.module} onChange={(event) => updateFilter("module", event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal text-[#06201c] outline-none focus:border-[#1f6a58]"><option value="">All modules</option><option value="products">Products</option><option value="services">Services</option><option value="events">Events</option><option value="trainings">Trainings</option></select></label>
          <label className="text-sm font-semibold text-[#31594d]">Currency<input type="search" value={filters.currency} onChange={(event) => updateFilter("currency", event.target.value.toUpperCase())} placeholder="ISO code" maxLength={3} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal uppercase text-[#06201c] outline-none placeholder:normal-case placeholder:text-[#9eb0a9] focus:border-[#1f6a58]" /></label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Commerce key performance indicators">
        {kpis.map((item) => <Link key={item.label} href={item.href} className="group rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d8ce] hover:shadow-md"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-lg font-bold text-[#1f6a58]">{item.icon}</span><span className="text-xs font-semibold text-[#7f9d94] group-hover:text-[#1f6a58]">View details →</span></div><p className="mt-5 text-2xl font-bold text-[#06201c]">—</p><h2 className="mt-1 text-sm font-semibold text-[#52736a]">{item.label}</h2></Link>)}
      </section>

      <RecentTransactions state="empty" />
    </>
  );
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
      <div className="flex flex-col gap-2 border-b border-[#edf3f0] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="recent-transactions-title" className="text-lg font-bold text-[#06201c]">Recent Transactions</h2><p className="mt-1 text-sm text-[#52736a]">No financial records are loaded in Phase 1.</p></div><span className="rounded-full bg-[#fff7e5] px-3 py-1 text-xs font-bold text-[#8a5a00]">Payments API pending</span></div>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm"><thead className="border-b border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[0.08em] text-[#52736a]"><tr><th className="px-5 py-3">Transaction ID</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Enterprise</th><th className="px-5 py-3">Module</th><th className="px-5 py-3">Amount / Currency</th><th className="px-5 py-3">Payment Status</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Action</th></tr></thead><tbody><tr><td colSpan={8} className="px-5 py-12 text-center"><p className="font-semibold text-[#06201c]">No transactions available</p><p className="mt-1 text-sm text-[#52736a]">Connect the documented Payments API before displaying financial records.</p></td></tr></tbody></table>
      </div>
    </section>
  );
}

function ComingSoonSection({ title }: { title: string }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-8 text-center shadow-sm sm:p-12"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f6ee] text-2xl font-bold text-[#1f6a58]">◌</div><h2 className="mt-5 text-xl font-bold text-[#06201c]">{title} is coming soon</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#52736a]">This Phase 1 route is available for navigation, but its functional implementation will wait for the backend Payments, Currency, Tax, Invoice, Refund or Settlement contract.</p><Link href="/commerce" className="mt-5 inline-flex rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#195646]">Back to Commerce Overview</Link></section>;
}
