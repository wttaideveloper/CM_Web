import { calculateEventRatingSummary } from "./event-reviews.service";
import type { EventReview } from "./event-reviews.types";

/** Shows approved Event rating totals and star distribution. */
export function EventRatingSummaryCard({ reviews, pendingCount }: { reviews: readonly EventReview[]; pendingCount: number }) {
  const summary = calculateEventRatingSummary(reviews);
  return <section aria-label="Event rating summary" className="rounded-xl border border-[#d7e5df] bg-[#f4faf7] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-[#1f6a58]">{summary.averageRatingDisplay}{summary.totalReviewsCount ? ` (${summary.totalReviewsCount} reviews)` : ""}</p>{pendingCount > 0 ? <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#805900]">{pendingCount} pending</span> : null}</div>
    <div className="mt-3 grid gap-1">{([5, 4, 3, 2, 1] as const).map((rating) => <div key={rating} className="flex items-center gap-2 text-xs text-[#52736a]"><span className="w-8">{rating} ★</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#1f6a58]" style={{ width: `${summary.totalReviewsCount ? summary.starBreakdown[rating] / summary.totalReviewsCount * 100 : 0}%` }} /></div><span className="w-6 text-right">{summary.starBreakdown[rating]}</span></div>)}</div>
  </section>;
}
