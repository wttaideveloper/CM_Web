"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useCurrentEnterprise } from "@ihp/enterprise-runtime";

type EventsSummary = { total_events: number; by_status: Record<string, number>; by_category: Record<string, number>; by_delivery_mode: Record<string, number>; upcoming_events: number; past_events: number; total_registrations: number; total_attended: number; average_rating: number | null; };
type TrainingsSummary = {
  total_trainings?: number;
  upcoming_trainings?: number;
  past_trainings?: number;
  total_registrations?: number;
  total_attended?: number;
  average_rating?: number | null;
  by_status?: Record<string, number>;
  by_category?: Record<string, number>;
  by_delivery_mode?: Record<string, number>;
};

async function getEventsSummary(enterpriseId: string): Promise<EventsSummary> {
  const response = await fetch(`/api/v1/events/reports/summary?${new URLSearchParams({ enterprise_id: enterpriseId }).toString()}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load Event analytics.");
  return (await response.json()) as EventsSummary;
}

async function getTrainingsSummary(): Promise<TrainingsSummary> {
  const response = await fetch("/api/v1/trainings/reports/summary", { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load Training analytics.");
  return (await response.json()) as TrainingsSummary;
}

export default function EnterpriseAnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<"events" | "trainings">("events");
  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f7fbf8] px-6 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">ENTERPRISE OWNER · PINNACLE WELLNESS</p>
          <h1 className="mt-1 text-2xl font-bold text-[#06201c]">My Analytics</h1>
          <p className="mt-1 text-sm text-[#5f7a71]">Track your enterprise performance and growth metrics</p>
        </div>

        <div role="tablist" aria-label="Analytics sections" className="border-b border-[#e1ebe6]">{(["events", "trainings"] as const).map((tab) => <button key={tab} id={`analytics-${tab}-tab`} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`analytics-${tab}-panel`} onClick={() => setActiveTab(tab)} className={`mr-6 border-b-2 px-1 pb-3 text-sm font-bold capitalize outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] ${activeTab === tab ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>{tab}</button>)}</div>
        {activeTab === "events" ? <section id="analytics-events-panel" role="tabpanel" aria-labelledby="analytics-events-tab"><EventsAnalytics /></section> : <section id="analytics-trainings-panel" role="tabpanel" aria-labelledby="analytics-trainings-tab"><TrainingsAnalytics /></section>}
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

function TrainingsAnalytics() {
  const { isLoadingEnterprise, enterpriseError } = useCurrentEnterprise();
  const summaryQuery = useQuery({ queryKey: ["training-reports", "summary"], queryFn: getTrainingsSummary, enabled: !isLoadingEnterprise && !enterpriseError, staleTime: 30_000, retry: 1 });
  if (isLoadingEnterprise || summaryQuery.isLoading) return <div role="status" aria-label="Loading Training analytics" className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div>;
  if (enterpriseError) return <p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm font-semibold text-[#b42318]">{enterpriseError}</p>;
  if (summaryQuery.isError) return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load Training analytics.</p><button type="button" onClick={() => void summaryQuery.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></div>;
  const summary = summaryQuery.data;
  if (!summary || summary.total_trainings === undefined) return <p className="rounded-xl bg-[#f8fbf9] p-5 text-sm font-semibold text-[#52736a]">No Training analytics are available yet.</p>;
  const metrics = [
    ["Total Trainings", summary.total_trainings],
    ["Upcoming Trainings", summary.upcoming_trainings],
    ["Past Trainings", summary.past_trainings],
    ["Total Registrations", summary.total_registrations],
    ["Total Attended", summary.total_attended],
    ["Average Rating", summary.average_rating ?? "Not rated"],
  ] as const;
  const deliveryModeBreakdown = Object.fromEntries(Object.entries(summary.by_delivery_mode ?? {}).filter(([mode]) => mode !== "instructor_led"));
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">{label}</p><p className="mt-2 text-2xl font-bold text-[#06201c]">{value}</p></div>)}</div><div className="grid gap-5 xl:grid-cols-3"><Breakdown title="Status breakdown" values={summary.by_status ?? {}} /><Breakdown title="Category breakdown" values={summary.by_category ?? {}} /><Breakdown title="Delivery-mode breakdown" values={deliveryModeBreakdown} /></div></div>;
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) { const entries = Object.entries(values ?? {}); return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#06201c]">{title}</h2>{entries.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No data available.</p> : <dl className="mt-4 divide-y divide-[#edf3f0]">{entries.map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3 py-3"><dt className="text-sm font-semibold capitalize text-[#31594d]">{key.replace(/_/g, " ")}</dt><dd className="text-sm font-bold text-[#06201c]">{value}</dd></div>)}</dl>}</section>; }
