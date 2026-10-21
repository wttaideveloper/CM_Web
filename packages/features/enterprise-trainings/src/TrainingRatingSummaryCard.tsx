import { calculateRatingSummary } from "./training-reviews.service";
import type { TrainingReview, TrainingStarRating } from "./training-reviews.types";

/** Displays approved-only Training rating metrics and star distribution. */
export function TrainingRatingSummaryCard({ reviews, pendingCount }: { reviews: readonly TrainingReview[]; pendingCount?: number }) {
  const summary = calculateRatingSummary(reviews);
  const pendingReviewsCount = pendingCount ?? summary.pendingReviewsCount;
  const maximumCount = Math.max(1, ...Object.values(summary.starBreakdown));

  return (
    <section aria-label="Training rating summary" className="rounded-xl border border-[#d7e5df] bg-[#f5faf7] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">Average rating</p>
          <p className="mt-1 text-xl font-bold text-[#1f6a58]">
            {summary.averageRatingDisplay}{summary.averageRating === null ? "" : ` (${summary.totalReviewsCount} ${summary.totalReviewsCount === 1 ? "review" : "reviews"})`}
          </p>
        </div>
        <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#52736a]">{pendingReviewsCount} pending</p>
      </div>
      <div className="mt-4 grid gap-1.5" aria-label="Approved review star distribution">
        {([5, 4, 3, 2, 1] as const).map((rating: TrainingStarRating) => {
          const count = summary.starBreakdown[rating];
          const width = `${Math.round((count / maximumCount) * 100)}%`;
          return (
            <div key={rating} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-xs text-[#52736a]">
              <span>{rating} ★</span>
              <span className="h-2 overflow-hidden rounded-full bg-[#e1ebe6]"><span className="block h-full rounded-full bg-[#1f6a58]" style={{ width }} /></span>
              <span className="text-right tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
