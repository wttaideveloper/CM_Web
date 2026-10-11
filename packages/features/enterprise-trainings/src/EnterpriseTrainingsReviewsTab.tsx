"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteTrainingReview, listEnterpriseReviewsManage, moderateTrainingReview, TrainingsApiError } from "./trainings.service";
import { normalizeUtcDate } from "./training-reviews.service";
import type { ReviewModerationStatus, TrainingStarRating } from "./training-reviews.types";
import { ReviewModerationAuditModal } from "./ReviewModerationAuditModal";

type ManageStatus = ReviewModerationStatus | "all";

const STATUS_FILTERS: readonly ManageStatus[] = ["pending", "approved", "rejected", "all"];
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

function reviewActions(status: ReviewModerationStatus): ReviewModerationStatus[] {
  return status === "pending" ? ["approved", "rejected"] : status === "approved" ? ["rejected", "pending"] : ["approved", "pending"];
}

function actionName(status: ReviewModerationStatus): string {
  return status === "pending" ? "Move to Pending" : status === "approved" ? "Approve" : "Reject";
}

/** Lists and moderates reviews across the current Enterprise's Trainings. */
export function EnterpriseTrainingsReviewsTab({ canModerate }: { canModerate: boolean }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ManageStatus>("pending");
  const [rating, setRating] = useState<TrainingStarRating | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showAudit, setShowAudit] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["training-reviews", "manage", status, page, rating, query],
    queryFn: () => listEnterpriseReviewsManage({ status, page, rating, q: query }),
    staleTime: 15_000,
    retry: 1,
  });
  const pageCount = Math.max(1, Math.ceil((reviewsQuery.data?.total ?? 0) / Math.max(1, reviewsQuery.data?.page_size ?? 1)));
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["training-reviews", "manage"] });
    void queryClient.invalidateQueries({ queryKey: ["training-reviews", "audit"] });
    void queryClient.invalidateQueries({ queryKey: ["trainings"] });
  };
  const moderateMutation = useMutation({
    mutationFn: ({ reviewId, nextStatus }: { reviewId: string; nextStatus: ReviewModerationStatus }) => moderateTrainingReview(reviewId, nextStatus),
    onSuccess: (_data, variables) => { setErrorMessage(null); setFeedback(`Review ${variables.nextStatus === "pending" ? "moved to pending" : variables.nextStatus}.`); refresh(); },
    onError: (error) => setErrorMessage(error instanceof TrainingsApiError ? error.message : "Unable to update review moderation."),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ reviewId }: { reviewId: string }) => deleteTrainingReview(reviewId),
    onSuccess: () => { setErrorMessage(null); setFeedback("Review deleted."); refresh(); },
    onError: (error) => setErrorMessage(error instanceof TrainingsApiError ? error.message : "Unable to delete this review."),
  });

  const reviews = useMemo(() => reviewsQuery.data?.reviews ?? [], [reviewsQuery.data?.reviews]);
  const counts = reviewsQuery.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const mutateStatus = (review: (typeof reviews)[number], nextStatus: ReviewModerationStatus) => {
    if (!canModerate || !review.training_id || moderateMutation.isPending || deleteMutation.isPending) return;
    if (nextStatus === "rejected" && !window.confirm(`Reject the review from ${review.participant_name}?`)) return;
    setFeedback(null);
    setErrorMessage(null);
    moderateMutation.mutate({ reviewId: review.id, nextStatus });
  };
  const deleteReview = (review: (typeof reviews)[number]) => {
    if (!canModerate || !review.training_id || moderateMutation.isPending || deleteMutation.isPending) return;
    if (!window.confirm(`Permanently delete the review from ${review.participant_name}? This cannot be undone.`)) return;
    setFeedback(null);
    setErrorMessage(null);
    deleteMutation.mutate({ reviewId: review.id });
  };

  return (
    <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-[#06201c]">Training reviews</h3><p className="mt-1 text-sm text-[#52736a]">Review feedback submitted by learners across your Trainings.</p></div>{canModerate ? <button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Moderation History</button> : null}</div>
      {feedback ? <p role="status" className="mt-4 rounded-lg border border-[#bce8d1] bg-[#effaf4] px-3 py-2 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {errorMessage ? <p role="alert" className="mt-4 rounded-lg border border-[#f3c7c3] bg-[#fff5f4] px-3 py-2 text-sm font-semibold text-[#b42318]">{errorMessage}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Training review status">
        {STATUS_FILTERS.map((value) => <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => { setStatus(value); setPage(1); }} className={`rounded-full px-3 py-2 text-sm font-semibold ${status === value ? "bg-[#e8f6ee] text-[#1f6a58]" : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f4faf7]"}`}>{value[0].toUpperCase() + value.slice(1)} ({counts[value]})</button>)}
        <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#52736a]">Rating<select value={rating} onChange={(event) => { setRating(event.target.value === "all" ? "all" : Number(event.target.value) as TrainingStarRating); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">All ratings</option>{([5, 4, 3, 2, 1] as const).map((star) => <option key={star} value={star}>{star} ★</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">Search<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Review comments" className="h-10 w-48 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]" /></label>
      </div>
      {reviewsQuery.isLoading ? <div aria-live="polite" aria-busy="true" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-6 text-sm text-[#52736a]">Loading reviews…</div> : null}
      {reviewsQuery.isError ? <div role="alert" className="mt-4 flex flex-wrap gap-3 text-sm text-[#b42318]"><span>{(reviewsQuery.error as Error).message}</span><button type="button" onClick={() => void reviewsQuery.refetch()} className="font-bold underline">Retry</button></div> : null}
      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? <p className="mt-5 text-sm text-[#52736a]">No Training reviews match these filters.</p> : null}
      {reviews.length > 0 ? <div className="mt-4 grid gap-3">{reviews.map((review) => <article key={review.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#06201c]">{review.participant_name}{review.verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#1f6a58]">Verified</span> : null}</p>{canModerate && review.participant_email ? <p className="mt-0.5 text-xs text-[#52736a]">{review.participant_email}</p> : null}<p className="mt-1 text-sm text-[#52736a]"><Link className="font-semibold text-[#1f6a58] underline" href={review.training_id ? `/admin/trainings/${review.training_id}` : "/admin/trainings"}>{review.training_title || "View Training"}</Link><span> · {formatDate(review.created_at)}</span></p></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating === null ? "Rating unavailable" : `${review.rating} ★`}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE_CLASS[review.moderation_status]}`}>{review.moderation_status}</span></div></div>
        {review.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{review.comment}</p> : null}
        {canModerate ? <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-3">{reviewActions(review.moderation_status).map((nextStatus) => <button key={nextStatus} type="button" onClick={() => mutateStatus(review, nextStatus)} disabled={!review.training_id || moderateMutation.isPending || deleteMutation.isPending} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-50">{actionName(nextStatus)}</button>)}<button type="button" onClick={() => deleteReview(review)} disabled={!review.training_id || moderateMutation.isPending || deleteMutation.isPending} className="rounded-full border border-[#e1c9c6] px-3 py-1.5 text-xs font-bold text-[#a52a20] hover:bg-[#fff1ef] disabled:opacity-50">Delete</button></div> : null}
      </article>)}</div> : null}
      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviewsQuery.data && reviewsQuery.data.total > reviewsQuery.data.page_size ? <nav aria-label="Review pagination" className="mt-4 flex items-center justify-between"><p className="text-sm text-[#52736a]">Page {reviewsQuery.data.page} of {pageCount}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm disabled:opacity-50">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm disabled:opacity-50">Next</button></div></nav> : null}
      {showAudit && canModerate ? <ReviewModerationAuditModal onClose={() => setShowAudit(false)} /> : null}
    </section>
  );
}
