"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getPlatformEventFeedback, getPlatformEventFeedbackReport, getPublishedEventDetails } from "./platform-events.service";

/** Shows private mobile attendee feedback and its aggregate report to Super Admins. */
export function PlatformEventFeedbackPanel({ eventId, onShowAllFeedback }: { eventId: string; onShowAllFeedback?: () => void }) {
  const [search, setSearch] = useState("");
  const eventDetails = useQuery({ queryKey: ["platform", "published-event-details", eventId], queryFn: () => getPublishedEventDetails(eventId), enabled: Boolean(eventId), staleTime: 60_000, retry: 1 });
  const feedback = useQuery({ queryKey: ["platform", "event-feedback", eventId], queryFn: () => getPlatformEventFeedback(eventId), enabled: Boolean(eventId), staleTime: 15_000, refetchOnMount: "always", refetchOnWindowFocus: true, retry: 1 });
  const report = useQuery({ queryKey: ["platform", "event-feedback-report", eventId], queryFn: () => getPlatformEventFeedbackReport(eventId), enabled: Boolean(eventId), staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: true, retry: 1 });
  const items = useMemo(() => {
    const reportItemsById = new Map((report.data?.data.feedbacks ?? []).map((entry) => [entry.id, entry]));
    return (feedback.data ?? []).map((entry) => ({ ...entry, rating: entry.rating ?? reportItemsById.get(entry.id)?.rating ?? null }));
  }, [feedback.data, report.data?.data.feedbacks]);
  const visible = useMemo(() => items.filter((entry) => [entry.participant_name, entry.participant_email, entry.comment].some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))), [items, search]);
  const ratings = items.flatMap((entry) => entry.rating == null ? [] : [entry.rating]);
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : report.data?.data.average_rating ?? null;
  const totalSubmissions = Math.max(feedback.data?.length ?? 0, report.data?.data.total_feedbacks ?? 0);

  return <section className="mt-4 space-y-4" aria-label="Mobile attendee feedback">
    <div className="grid gap-3 sm:grid-cols-2">
      <Metric label="Mobile submissions" value={feedback.isPending && !feedback.data ? "—" : totalSubmissions} />
      <Metric label="Average rating" value={averageRating == null ? "—" : `${averageRating.toFixed(1)} / 5`} />
    </div>
    {report.isError ? <ErrorMessage message={report.error.message} onRetry={() => void report.refetch()} /> : null}
    <div className="flex flex-wrap justify-end gap-2">{onShowAllFeedback ? <button type="button" onClick={onShowAllFeedback} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">View all Event feedback</button> : null}<button type="button" disabled={feedback.isFetching || report.isFetching} onClick={() => { void Promise.all([feedback.refetch(), report.refetch()]); }} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-wait disabled:opacity-60">{feedback.isFetching || report.isFetching ? "Refreshing…" : "Refresh feedback"}</button></div>
    <label className="block text-sm font-semibold text-[#31594d]">Search attendee feedback<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or comment" className="mt-2 h-11 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label>
    {feedback.isLoading ? <p role="status" className="rounded-xl bg-[#f4faf7] p-5 text-sm">Loading attendee feedback…</p> : null}
    {feedback.isError ? <ErrorMessage message={feedback.error.message} onRetry={() => void feedback.refetch()} /> : null}
    {!feedback.isLoading && !feedback.isError && feedback.data?.length === 0 ? <p className="rounded-xl bg-[#f8fbf9] p-5 text-sm text-[#52736a]">No mobile attendee feedback submitted yet.</p> : null}
    {!feedback.isLoading && !feedback.isError && feedback.data && feedback.data.length > 0 && visible.length === 0 ? <p className="rounded-xl bg-[#f8fbf9] p-5 text-sm text-[#52736a]">No feedback matches this search.</p> : null}
    <div className="grid gap-3">{visible.map((entry) => <article key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
      {eventDetails.data?.title ? <p className="mb-2"><Link href={`/events?view=reviews&item_id=${encodeURIComponent(eventId)}&subview=feedback`} className="font-semibold text-[#1f6a58] underline">{eventDetails.data.title}</Link></p> : null}
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[#06201c]">{entry.participant_name}</p>{entry.participant_email ? <p className="mt-1 text-xs text-[#52736a]">{entry.participant_email}</p> : null}<time className="mt-1 block text-xs text-[#7f9d94]">{formatDateTime(entry.created_at)}</time></div><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-sm font-bold text-[#1f6a58]">{entry.rating == null ? "Rating unavailable" : `${entry.rating} / 5`}</span></div>
      {entry.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{entry.comment}</p> : null}
      {Object.keys(entry.answers).length ? <dl className="mt-3 space-y-2 border-t border-[#e1ebe6] pt-3">{Object.entries(entry.answers).map(([question, answer]) => <div key={question}><dt className="text-xs font-semibold text-[#7f9d94]">{question}</dt><dd className="mt-0.5 whitespace-pre-wrap text-sm text-[#3c5d54]">{formatAnswer(answer)}</dd></div>)}</dl> : null}
    </article>)}</div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-[#f8fbf9] p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">{label}</p><p className="mt-2 text-2xl font-bold text-[#06201c]">{value}</p></div>; }
function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#b42318]">{message}<button type="button" onClick={onRetry} className="ml-2 font-semibold underline">Try again</button></div>; }
function formatDateTime(value: string | null): string { if (!value) return "Date unavailable"; const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`); return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatAnswer(value: unknown): string { if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value); return value == null ? "—" : JSON.stringify(value) ?? String(value); }
