"use client";

import { useQuery } from "@tanstack/react-query";

import { EventsApiError, getEventReport } from "./events.service";

/** Lazy Event-detail reporting view for backend-authoritative report data. */
export default function EventReportsSection({ eventId }: { eventId: string }) {
  const reportQuery = useQuery({ queryKey: ["event-reports", "detail", eventId, "registration", "json"], queryFn: () => getEventReport(eventId), enabled: Boolean(eventId), staleTime: 30_000, retry: 1 });

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Event report</p><h2 className="mt-1 text-lg font-bold text-[#06201c]">Registration report</h2></div><ReportState query={reportQuery} /></section>;
}

function ReportState({ query }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getEventReport>>, Error>> }) {
  if (query.isLoading) return <div role="status" aria-label="Loading event report" className="mt-4 space-y-3"><div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" /><div className="h-20 animate-pulse rounded-xl bg-[#f1f4f3]" /></div>;
  if (query.isError) return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">{getReportErrorMessage(query.error)}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></div>;
  if (!query.data) return <p className="mt-4 rounded-xl bg-[#f8fbf9] px-4 py-5 text-sm font-semibold text-[#52736a]">No registration report is available yet.</p>;
  return <div className="mt-4 space-y-5"><div className="rounded-xl bg-[#f8fbf9] p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">Total registrations</p><p className="mt-2 text-2xl font-bold text-[#06201c]">{query.data.data.total_registrations}</p></div><Breakdown title="Registration status breakdown" values={query.data.data.by_status} emptyMessage="No registration statuses recorded." /><Breakdown title="Ticket type breakdown" values={query.data.data.by_ticket_type} emptyMessage="No ticket type registrations recorded." /></div>;
}

function Breakdown({ title, values, emptyMessage }: { title: string; values: Record<string, number>; emptyMessage: string }) { const entries = Object.entries(values); return <section><h3 className="text-sm font-bold text-[#06201c]">{title}</h3>{entries.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">{emptyMessage}</p> : <dl className="mt-2 divide-y divide-[#edf3f0] rounded-xl border border-[#e1ebe6]">{entries.map(([key, value]) => <div key={key} className="flex items-center justify-between gap-4 px-4 py-3"><dt className="text-sm font-semibold text-[#31594d]">{key.replace(/_/g, " ")}</dt><dd className="text-sm font-bold text-[#06201c]">{value}</dd></div>)}</dl>}</section>; }
function getReportErrorMessage(error: Error): string { if (!(error instanceof EventsApiError)) return "Unable to load this report."; if (error.status === 401 || error.status === 403) return "You do not have access to this report."; if (error.status === 404) return "This report is not available for the event."; return "Unable to load this report."; }
