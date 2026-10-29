"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getPlatformEventFeedback, getPlatformEventFeedbackReport, getPlatformEventsForFeedback, type PlatformEventFeedbackItem } from "./platform-events.service";

type EventFeedbackEntry = PlatformEventFeedbackItem & { event_title: string };
type AllEventFeedbackResult = { entries: EventFeedbackEntry[]; totalSubmissions: number; averageRating: number | null };

/** Shows mobile attendee feedback across all Events in the Super Admin portal. */
export function PlatformAllEventFeedbackPanel() {
  const [search, setSearch] = useState("");
  const feedbackQuery = useQuery({
    queryKey: ["platform", "event-feedback", "all-events"],
    queryFn: loadAllEventFeedback,
    staleTime: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const entries = feedbackQuery.data?.entries ?? [];
  const averageRating = feedbackQuery.data?.averageRating ?? null;
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return entries;
    return entries.filter((entry) => [entry.event_title, entry.participant_name, entry.participant_email, entry.comment]
      .some((value) => value?.toLocaleLowerCase().includes(term)));
  }, [entries, search]);

  return <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-label="Event attendee feedback across all events">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-xl font-bold text-[#06201c]">Mobile Attendee Feedback</h3><p className="mt-1 text-sm text-[#52736a]">Feedback submitted in the mobile app across Events.</p></div>
      <button type="button" disabled={feedbackQuery.isFetching} onClick={() => void feedbackQuery.refetch()} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">{feedbackQuery.isFetching ? "Refreshing…" : "Refresh feedback"}</button>
    </header>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Metric label="Total mobile submissions" value={feedbackQuery.isPending && !feedbackQuery.data ? "—" : feedbackQuery.data?.totalSubmissions ?? 0} />
      <Metric label="Average rating" value={averageRating == null ? "—" : `${averageRating.toFixed(1)} / 5`} />
    </div>
    <label className="mt-4 block text-sm font-semibold text-[#31594d]">Search feedback<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Event, attendee, email, or comment" className="mt-2 h-11 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label>
    {feedbackQuery.isPending ? <p role="status" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm text-[#52736a]">Loading Event feedback…</p> : null}
    {feedbackQuery.isError ? <div role="alert" className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#b42318]">{feedbackQuery.error.message}<button type="button" onClick={() => void feedbackQuery.refetch()} className="ml-2 font-semibold underline">Try again</button></div> : null}
    {!feedbackQuery.isPending && !feedbackQuery.isError && entries.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8fbf9] p-5 text-sm text-[#52736a]">No mobile attendee feedback has been submitted for any Event yet.</p> : null}
    {!feedbackQuery.isPending && !feedbackQuery.isError && entries.length > 0 && visible.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8fbf9] p-5 text-sm text-[#52736a]">No feedback matches this search.</p> : null}
    <div className="mt-4 grid gap-3">{visible.map((entry) => <FeedbackCard key={`${entry.event_id}-${entry.id}`} entry={entry} />)}</div>
  </section>;
}

async function loadAllEventFeedback(): Promise<AllEventFeedbackResult> {
  const events = await getPlatformEventsForFeedback();
  const entries: EventFeedbackEntry[] = [];
  let totalSubmissions = 0;
  let ratingTotal = 0;
  let ratingCount = 0;
  for (let offset = 0; offset < events.length; offset += 8) {
    const batch = events.slice(offset, offset + 8);
    const feedbackByEvent = await Promise.all(batch.map(async (event) => {
      const [feedback, report] = await Promise.all([getPlatformEventFeedback(event.id), getPlatformEventFeedbackReport(event.id)]);
      return { event, feedback, report };
    }));
    for (const { event, feedback, report } of feedbackByEvent) {
      const reportEntriesById = new Map((report.data.feedbacks ?? []).map((entry) => [entry.id, entry]));
      const enrichedFeedback = feedback.map((entry) => {
        const reportEntry = reportEntriesById.get(entry.id);
        return { ...entry, rating: entry.rating ?? reportEntry?.rating ?? null, event_title: event.title };
      });
      entries.push(...enrichedFeedback);
      totalSubmissions += Math.max(feedback.length, report.data.total_feedbacks);
      const feedbackRatings = enrichedFeedback.flatMap((entry) => entry.rating == null ? [] : [entry.rating]);
      if (feedbackRatings.length) {
        ratingTotal += feedbackRatings.reduce((sum, rating) => sum + rating, 0);
        ratingCount += feedbackRatings.length;
      } else if (report.data.average_rating !== null && report.data.approved_reviews > 0) {
        ratingTotal += report.data.average_rating * report.data.approved_reviews;
        ratingCount += report.data.approved_reviews;
      }
    }
  }
  return {
    entries: entries.sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at)),
    totalSubmissions,
    averageRating: ratingCount ? ratingTotal / ratingCount : null,
  };
}

function FeedbackCard({ entry }: { entry: EventFeedbackEntry }) {
  return <article className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Link href={`/events?view=reviews&item_id=${encodeURIComponent(entry.event_id)}&subview=feedback`} className="font-semibold text-[#1f6a58] underline">{entry.event_title}</Link><p className="mt-2 font-bold text-[#06201c]">{entry.participant_name}</p>{entry.participant_email ? <p className="mt-1 text-xs text-[#52736a]">{entry.participant_email}</p> : null}<time className="mt-1 block text-xs text-[#7f9d94]">{formatDateTime(entry.created_at)}</time></div>
      <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-sm font-bold text-[#1f6a58]">{entry.rating == null ? "Rating unavailable" : `${entry.rating} / 5`}</span>
    </div>
    {entry.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{entry.comment}</p> : null}
    {Object.keys(entry.answers).length ? <dl className="mt-3 space-y-2 border-t border-[#e1ebe6] pt-3">{Object.entries(entry.answers).map(([question, answer]) => <div key={question}><dt className="text-xs font-semibold text-[#7f9d94]">{question}</dt><dd className="mt-0.5 whitespace-pre-wrap text-sm text-[#3c5d54]">{formatAnswer(answer)}</dd></div>)}</dl> : null}
  </article>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-[#f8fbf9] p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">{label}</p><p className="mt-2 text-2xl font-bold text-[#06201c]">{value}</p></div>; }
function formatDateTime(value: string | null): string { if (!value) return "Date unavailable"; const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`); return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatAnswer(value: unknown): string { if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value); return value == null ? "—" : JSON.stringify(value) ?? String(value); }
function toTimestamp(value: string | null): number { if (!value) return 0; const time = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`).getTime(); return Number.isFinite(time) ? time : 0; }
