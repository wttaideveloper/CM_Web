"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useCurrentEnterprise } from "@ihp/enterprise-runtime";

type EventsSummary = { total_events: number; by_status: Record<string, number>; by_category: Record<string, number>; by_delivery_mode: Record<string, number>; upcoming_events: number; past_events: number; total_registrations: number; total_attended: number; average_rating: number | null; };

async function getEventsSummary(enterpriseId: string): Promise<EventsSummary> {
  const response = await fetch(`/api/v1/events/reports/summary?${new URLSearchParams({ enterprise_id: enterpriseId }).toString()}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load Event analytics.");
  return (await response.json()) as EventsSummary;
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2v20M16.5 6.5c0-1.9-2-3.5-4.5-3.5S7.5 4.6 7.5 6.5 9.3 9 12 9s4.5 1.1 4.5 3-2 3.5-4.5 3.5-4.5 1.6-4.5 3.5S9.5 22 12 22s4.5-1.4 4.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="m12 3 2.8 5.68 6.27.91-4.53 4.42 1.07 6.25L12 17.3l-5.62 2.96 1.07-6.25L2.92 9.6l6.27-.91L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm5 14v-2a4 4 0 0 0-3-3.87M17 4.13a4 4 0 0 1 0 7.74"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const topMetrics = [
  {
    label: "Total Bookings",
    value: "1,284",
    change: "+22%",
    icon: <CalendarIcon />,
    iconTone: "bg-[#e8f6ee] text-[#1f6a58]",
  },
  {
    label: "Revenue",
    value: "$12,400",
    change: "+8.2%",
    icon: <RevenueIcon />,
    iconTone: "bg-[#eef4ff] text-[#2563eb]",
  },
  {
    label: "Avg Rating",
    value: "4.8 ★",
    change: null,
    icon: <StarIcon />,
    iconTone: "bg-[#fff7e8] text-[#d97706]",
  },
  {
    label: "Repeat Customers",
    value: "68%",
    change: "+5%",
    icon: <UsersIcon />,
    iconTone: "bg-[#f4f0ff] text-[#7c3aed]",
  },
] as const;

const topServices = [
  { label: "Group Yoga Class", value: "156 bookings", progress: 92 },
  { label: "Personal Training", value: "42 bookings", progress: 58 },
  { label: "Nutrition Coaching", value: "28 bookings", progress: 42 },
  { label: "Sports Massage", value: "18 bookings", progress: 28 },
] as const;

const topProducts = [
  { label: "Premium Yoga Mat", value: "$11,390", progress: 64 },
  { label: "Whey Protein Blend", value: "$17,748", progress: 96 },
  { label: "Resistance Band Set", value: "$3,289", progress: 24 },
  { label: "Foam Roller Pro", value: "$9,572", progress: 56 },
] as const;

function MetricCard({
  label,
  value,
  change,
  icon,
  iconTone,
}: (typeof topMetrics)[number]) {
  return (
    <div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>
          {icon}
        </span>
        {change ? (
          <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-bold text-[#0f8a63]">
            {change}
          </span>
        ) : null}
      </div>
      <p className="text-2xl font-bold text-[#06201c]">{value}</p>
      <p className="mt-1 text-sm text-[#6b847c]">{label}</p>
    </div>
  );
}

function RankingCard({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ label: string; value: string; progress: number }>;
}) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-[#06201c]">{title}</h3>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#06201c]">{item.label}</p>
              <span className="text-sm font-semibold text-[#1f6a58]">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-[#ecf4ef]">
              <div
                className="h-2 rounded-full bg-[#1f6a58]"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EnterpriseAnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<"overview" | "events">("overview");
  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f7fbf8] px-6 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
            ENTERPRISE OWNER · PINNACLE WELLNESS
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#06201c]">My Analytics</h1>
          <p className="mt-1 text-sm text-[#5f7a71]">
            Track your enterprise performance and growth metrics
          </p>
        </div>

        <div role="tablist" aria-label="Analytics sections" className="border-b border-[#e1ebe6]">{(["overview", "events"] as const).map((tab) => <button key={tab} id={`analytics-${tab}-tab`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`analytics-${tab}-panel`} onClick={() => setActiveTab(tab)} className={`mr-6 border-b-2 px-1 pb-3 text-sm font-bold capitalize outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] ${activeTab === tab ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>{tab}</button>)}</div>
        {activeTab === "overview" ? <div id="analytics-overview-panel" role="tabpanel" aria-labelledby="analytics-overview-tab"><div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">{topMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div><div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2"><RankingCard title="Top Services by Bookings" items={topServices} /><RankingCard title="Top Products by Revenue" items={topProducts} /></div></div> : <section id="analytics-events-panel" role="tabpanel" aria-labelledby="analytics-events-tab"><EventsAnalytics /></section>}
      </div>
    </div>
  );
}

function EventsAnalytics() {
  const { enterpriseId, isLoadingEnterprise, enterpriseError } = useCurrentEnterprise();
  const summaryQuery = useQuery({ queryKey: ["event-reports", "summary", enterpriseId], queryFn: () => getEventsSummary(enterpriseId as string), enabled: Boolean(enterpriseId), staleTime: 30_000, retry: 1 });
  if (isLoadingEnterprise || summaryQuery.isLoading) return <div role="status" aria-label="Loading Event analytics" className="grid gap-4 md:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div>;
  if (enterpriseError || !enterpriseId) return <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm font-semibold text-[#b42318]">{enterpriseError ?? "No enterprise is available for Event analytics."}</p>;
  if (summaryQuery.isError) return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load Event analytics.</p><button type="button" onClick={() => void summaryQuery.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></div>;
  const summary = summaryQuery.data;
  if (!summary) return <p className="rounded-xl bg-[#f8fbf9] p-5 text-sm font-semibold text-[#52736a]">No Event analytics are available yet.</p>;
  const metrics = [["Total Events", summary.total_events], ["Upcoming Events", summary.upcoming_events], ["Past Events", summary.past_events], ["Total Registrations", summary.total_registrations], ["Total Attended", summary.total_attended], ["Average Rating", summary.average_rating ?? "Not rated"]] as const;
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">{label}</p><p className="mt-2 text-2xl font-bold text-[#06201c]">{value}</p></div>)}</div><div className="grid gap-5 xl:grid-cols-3"><Breakdown title="Status breakdown" values={summary.by_status} /><Breakdown title="Category breakdown" values={summary.by_category} /><Breakdown title="Delivery-mode breakdown" values={summary.by_delivery_mode} /></div></div>;
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) { const entries = Object.entries(values ?? {}); return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#06201c]">{title}</h2>{entries.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No data available.</p> : <dl className="mt-4 divide-y divide-[#edf3f0]">{entries.map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3 py-3"><dt className="text-sm font-semibold capitalize text-[#31594d]">{key.replace(/_/g, " ")}</dt><dd className="text-sm font-bold text-[#06201c]">{value}</dd></div>)}</dl>}</section>; }
