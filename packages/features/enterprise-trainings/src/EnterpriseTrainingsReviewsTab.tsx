"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReviewCardLayout, ReviewComment, ReviewItemName, ReviewerIdentity } from "@ihp/ui";

import { getTrainingReviewsAudit, listEnterpriseReviewsManage } from "./trainings.service";
import { normalizeUtcDate } from "./training-reviews.service";
import type { ReviewModerationStatus, TrainingReviewAuditEntry, TrainingStarRating } from "./training-reviews.types";
import { ReviewModerationAuditModal } from "./ReviewModerationAuditModal";

type ReviewStatusFilter = ReviewModerationStatus | "all";
const STATUS_FILTERS: readonly ReviewStatusFilter[] = ["all", "approved", "pending", "rejected"];
const REVIEW_PAGE_SIZE = 15;
const reviewStatusLabel = (status: ReviewStatusFilter): string => status === "all" ? "All" : status === "approved" ? "Published" : status[0].toUpperCase() + status.slice(1);
const STATUS_BADGE_CLASS: Record<ReviewModerationStatus, string> = {
  pending: "bg-[#fff4d6] text-[#805900]",
  approved: "bg-[#e8f6ee] text-[#1f6a58]",
  rejected: "bg-[#f0f3f2] text-[#52736a]",
};

function formatDate(value: string | null): string {
  const normalized = normalizeUtcDate(value);
  if (!normalized) return "Date unavailable";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function reviewDate(review: { created_at: string | null; updated_at: string | null }): string {
  const created = normalizeUtcDate(review.created_at);
  const updated = normalizeUtcDate(review.updated_at);
  return formatDate(updated && created && Date.parse(updated) > Date.parse(created) ? updated : created ?? updated);
}

function auditActorLabel(entry: TrainingReviewAuditEntry): string {
  const role = entry.actor_role?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const roleLabel = role.includes("super_admin") || role.includes("platform_admin") ? "Super Admin" : entry.actor_role ?? "Staff";
  const name = entry.actor_name && !entry.actor_name.includes("@") ? entry.actor_name : null;
  return [roleLabel, name].filter(Boolean).join(" · ");
}

/** Lists reviews and moderation history across the current Enterprise's Trainings. */
export function EnterpriseTrainingsReviewsTab() {
  const [status, setStatus] = useState<ReviewStatusFilter>("approved");
  const [rating, setRating] = useState<TrainingStarRating | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showAudit, setShowAudit] = useState(false);

  const reviewsQuery = useQuery({
    queryKey: ["training-reviews", "manage", status, page, rating, query],
    queryFn: () => listEnterpriseReviewsManage({ status, page, pageSize: REVIEW_PAGE_SIZE, rating, q: query }),
    staleTime: 15_000,
    retry: 1,
  });
  const auditItemIds = [...new Set((reviewsQuery.data?.reviews ?? []).map((review) => review.training_id).filter((id): id is string => Boolean(id)))];
  const auditQuery = useQuery({
    queryKey: ["training-reviews", "audit", "items", auditItemIds],
    queryFn: async () => (await Promise.all(auditItemIds.map((id) => getTrainingReviewsAudit(id)))).flat(),
    enabled: auditItemIds.length > 0,
    staleTime: 15_000,
    refetchOnMount: "always",
    retry: 1,
  });
  const pageCount = Math.max(1, Math.ceil((reviewsQuery.data?.total ?? 0) / Math.max(1, reviewsQuery.data?.page_size ?? 1)));
  const reviews = useMemo(() => reviewsQuery.data?.reviews ?? [], [reviewsQuery.data?.reviews]);
  const latestAuditByReviewId = useMemo(() => {
    const latest = new Map<string, TrainingReviewAuditEntry>();
    for (const entry of auditQuery.data ?? []) {
      const previous = latest.get(entry.review_id);
      const entryTime = Date.parse(normalizeUtcDate(entry.created_at) ?? "");
      const previousTime = previous ? Date.parse(normalizeUtcDate(previous.created_at) ?? "") : Number.NaN;
      if (!previous || (Number.isFinite(entryTime) && (!Number.isFinite(previousTime) || entryTime > previousTime))) latest.set(entry.review_id, entry);
    }
    return latest;
  }, [auditQuery.data]);
  const counts = reviewsQuery.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  return (
    <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-[#06201c]">Training reviews</h3><p className="mt-1 text-sm text-[#52736a]">Review feedback submitted by learners across your Trainings.</p></div><button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Moderation History</button></div>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Training review status">
        {STATUS_FILTERS.map((value) => <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => { setStatus(value); setPage(1); }} className={`rounded-full px-3 py-2 text-sm font-semibold ${status === value ? "bg-[#e8f6ee] text-[#1f6a58]" : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f4faf7]"}`}>{reviewStatusLabel(value)} ({counts[value] ?? 0})</button>)}
        <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#52736a]">Rating<select value={rating} onChange={(event) => { setRating(event.target.value === "all" ? "all" : Number(event.target.value) as TrainingStarRating); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((star) => <option key={star} value={star}>{star} ★</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">Search<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Review comments" className="h-10 w-48 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]" /></label>
      </div>
      <p className="mt-2 text-xs text-[#68867c]">All includes Pending, Published, and Rejected reviews. Pending shows reviews awaiting moderation.</p>
      {reviewsQuery.isLoading ? <div aria-live="polite" aria-busy="true" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-6 text-sm text-[#52736a]">Loading reviews…</div> : null}
      {reviewsQuery.isError ? <div role="alert" className="mt-4 flex flex-wrap gap-3 text-sm text-[#b42318]"><span>{(reviewsQuery.error as Error).message}</span><button type="button" onClick={() => void reviewsQuery.refetch()} className="font-bold underline">Retry</button></div> : null}
      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? <p className="mt-5 text-sm text-[#52736a]">No Training reviews match these filters.</p> : null}
      {reviews.length > 0 ? <div className="mt-4 grid gap-3">{reviews.map((review) => { const trainingName = review.training_title || "View Training"; const latest = latestAuditByReviewId.get(review.id); return <ReviewCardLayout key={review.id} item={<Link className="font-semibold text-[#1f6a58] underline" title={trainingName} href={review.training_id ? `/admin/trainings/${encodeURIComponent(review.training_id)}?tab=reviews` : "/admin/trainings?view=reviews"}><ReviewItemName fullName={trainingName}>{trainingName}</ReviewItemName></Link>} reviewer={<ReviewerIdentity name={review.participant_name ?? "Anonymous"} email={review.participant_email} verified={review.verified} />} rating={<span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating === null ? "Rating unavailable" : `${review.rating} ★`}</span>} status={<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE_CLASS[review.moderation_status]}`}>{reviewStatusLabel(review.moderation_status)}</span>} date={<time>{reviewDate(review)}</time>} latestAction={latest ? `Latest action: ${latest.to_status.replace(/[_-]+/g, " ").replace(/^\w/, (character) => character.toLocaleUpperCase())} by ${auditActorLabel(latest)}` : undefined}><ReviewComment comment={review.comment} /></ReviewCardLayout>; })}</div> : null}
      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviewsQuery.data && pageCount > 1 ? <nav aria-label="Review pagination" className="mt-5 flex items-center justify-between gap-3 border-t border-[#e1ebe6] pt-4"><p aria-live="polite" className="text-sm text-[#52736a]">Page {reviewsQuery.data.page} of {pageCount}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || reviewsQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">Previous</button><button type="button" disabled={page >= pageCount || reviewsQuery.isFetching} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Next</button></div></nav> : null}
      {showAudit ? <ReviewModerationAuditModal onClose={() => setShowAudit(false)} /> : null}
    </section>
  );
}
