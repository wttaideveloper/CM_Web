import type { ServiceDto } from "../types/service.types";

function formatReviewDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** Displays the approved rating summary and recent public Service reviews when present. */
export function ServiceReviewsSummary({ service }: { service: ServiceDto }) {
  if (typeof service.reviews_count !== "number" && !service.reviews?.length) return null;
  const count = service.reviews_count ?? service.reviews?.length ?? 0;
  return <section id="service-reviews" className="mt-4 scroll-mt-24 rounded-2xl border border-[#e1ebe6] bg-white p-4" aria-labelledby="service-reviews-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="service-reviews-heading" className="text-lg font-bold text-[#06201c]">Ratings &amp; Reviews</h3><p className="mt-1 text-sm text-[#52736a]">{count > 0 ? `${count} customer reviews` : "No ratings yet"}</p></div>{count > 0 && typeof service.rating === "number" ? <span className="rounded-full bg-[#fff8e8] px-3 py-1 text-sm font-bold text-[#805900]">{service.rating.toFixed(1)} ★</span> : null}</div>{service.reviews?.length ? <div className="mt-4 grid gap-3">{service.reviews.map((review) => <article key={review.id} className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#06201c]">{review.reviewer_name && !review.reviewer_name.includes("@") ? review.reviewer_name : "Customer"}</p><span className="text-sm font-bold text-[#805900]">{review.rating} ★</span></div><time className="mt-1 block text-xs text-[#7f9d94]">{formatReviewDate(review.created_at)}</time>{review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{review.comment}</p> : null}</article>)}</div> : count === 0 ? <p className="mt-3 text-sm text-[#52736a]">Be the first to review this service.</p> : null}</section>;
}
