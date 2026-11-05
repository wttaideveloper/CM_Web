"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReviewCardLayout, ReviewComment, ReviewItemName, ReviewerIdentity } from "@ihp/ui";

type CatalogReviewModule = "product" | "service";
type ReviewStatus = "pending" | "approved" | "rejected";
type StatusFilter = ReviewStatus | "all";
const REVIEW_PAGE_SIZE = 15;
interface ReviewItem {
  id: string;
  itemId: string;
  itemName: string;
  reviewerName: string;
  reviewerEmail: string | null;
  rating: number | null;
  comment: string | null;
  status: ReviewStatus;
  verified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}
interface ReviewPage {
  items: ReviewItem[];
  counts: Record<StatusFilter, number>;
  page: number;
  pageSize: number;
  total: number;
}
interface AuditItem {
  id: string;
  itemName: string | null;
  customerName: string | null;
  fromStatus: string | null;
  toStatus: string;
  actorName: string | null;
  createdAt: string | null;
  reason: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePage(value: unknown): ReviewPage {
  if (!isRecord(value) || !Array.isArray(value.items)) throw new Error("Reviews API returned an invalid response.");
  const items = value.items.flatMap((row): ReviewItem[] => {
    if (!isRecord(row) || typeof (row.review_id ?? row.id) !== "string" || typeof (row.item_id ?? row.product_id ?? row.service_id) !== "string") return [];
    const status = row.moderation_status ?? row.status;
    if (status !== "pending" && status !== "approved" && status !== "rejected") return [];
    const rating = Number(row.rating);
    return [{ id: String(row.review_id ?? row.id), itemId: String(row.item_id ?? row.product_id ?? row.service_id), itemName: typeof row.item_name === "string" ? row.item_name : "Catalog item", reviewerName: typeof row.reviewer_name === "string" && !row.reviewer_name.includes("@") ? row.reviewer_name : "Customer", reviewerEmail: typeof row.reviewer_email === "string" ? row.reviewer_email : null, rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null, comment: typeof row.comment === "string" ? row.comment : null, status, verified: row.is_verified_purchase === true || row.is_verified === true, createdAt: typeof row.created_at === "string" ? row.created_at : null, updatedAt: typeof row.updated_at === "string" ? row.updated_at : null }];
  });
  const counts = isRecord(value.counts) ? value.counts : {};
  const number = (key: string, fallback: number) => typeof counts[key] === "number" ? counts[key] as number : fallback;
  const pagination = isRecord(value.pagination) ? value.pagination : {};
  return { items, counts: { all: number("all", items.length), pending: number("pending", items.filter((item) => item.status === "pending").length), approved: number("approved", items.filter((item) => item.status === "approved").length), rejected: number("rejected", items.filter((item) => item.status === "rejected").length) }, page: typeof pagination.page === "number" ? pagination.page : 1, pageSize: typeof pagination.page_size === "number" ? pagination.page_size : REVIEW_PAGE_SIZE, total: typeof pagination.total === "number" ? pagination.total : items.length };
}

async function loadReviews(module: CatalogReviewModule, status: StatusFilter, rating: string, search: string, itemId: string | null, page: number): Promise<ReviewPage> {
  const params = new URLSearchParams({ module, page: String(page), page_size: String(REVIEW_PAGE_SIZE) });
  if (status !== "all") params.set("status", status);
  if (rating !== "all") params.set("rating", rating);
  if (search.trim()) params.set("q", search.trim());
  if (itemId) params.set("item_id", itemId);
  const response = await fetch(`/api/v1/reviews/manage?${params}`, { credentials: "include", cache: "no-store" });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(isRecord(payload) && typeof payload.detail === "string" ? payload.detail : "Unable to load reviews.");
  return parsePage(payload);
}

async function loadAudit(module: CatalogReviewModule, itemId: string | null): Promise<AuditItem[]> {
  const params = new URLSearchParams({ module, page: "1", page_size: "100" });
  if (itemId) params.set("item_id", itemId);
  const response = await fetch(`/api/v1/reviews/audit?${params}`, { credentials: "include", cache: "no-store" });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(isRecord(payload) && typeof payload.detail === "string" ? payload.detail : "Unable to load review history.");
  const rows = Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
  return rows.flatMap((row, index): AuditItem[] => isRecord(row) && typeof row.to_status === "string" ? [{ id: typeof row.id === "string" ? row.id : `audit-${index}`, itemName: typeof row.item_name === "string" ? row.item_name : null, customerName: typeof row.customer_name === "string" ? row.customer_name : null, fromStatus: typeof row.from_status === "string" ? row.from_status : null, toStatus: row.to_status, actorName: typeof row.actor_name === "string" ? row.actor_name : null, createdAt: typeof row.created_at === "string" ? row.created_at : null, reason: typeof row.reason === "string" ? row.reason : null }] : []);
}

function dateLabel(value: string | null): string {
  if (!value) return "Date unavailable";
  const utc = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function reviewDateLabel(review: Pick<ReviewItem, "createdAt" | "updatedAt">): string {
  const created = review.createdAt ? (/Z|[+-]\d{2}:?\d{2}$/i.test(review.createdAt) ? review.createdAt : `${review.createdAt}Z`) : null;
  const updated = review.updatedAt ? (/Z|[+-]\d{2}:?\d{2}$/i.test(review.updatedAt) ? review.updatedAt : `${review.updatedAt}Z`) : null;
  const timestamp = updated && created && Date.parse(updated) > Date.parse(created) ? updated : created ?? updated;
  return dateLabel(timestamp);
}

/** Shows a read-only Product or Service review queue to Enterprise Admins. */
export function EnterpriseCatalogReviewsTab({ module, itemId = null, reviewId = null, initialStatus = "all", openAuditOnLoad = false }: { module: CatalogReviewModule; itemId?: string | null; reviewId?: string | null; initialStatus?: StatusFilter; openAuditOnLoad?: boolean }) {
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [rating, setRating] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showHistory, setShowHistory] = useState(openAuditOnLoad);
  const query = useQuery({ queryKey: ["catalog-reviews", module, itemId, status, rating, search, page], queryFn: () => loadReviews(module, status, rating, search, itemId, page), staleTime: 15_000, retry: 1 });
  const audit = useQuery({ queryKey: ["catalog-review-audit", module, itemId], queryFn: () => loadAudit(module, itemId), enabled: showHistory, staleTime: 15_000, retry: 1 });
  useEffect(() => setShowHistory(openAuditOnLoad), [openAuditOnLoad]);
  useEffect(() => {
    if (!reviewId || query.isLoading) return;
    document.getElementById(`enterprise-catalog-review-${reviewId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [reviewId, query.isLoading, query.data?.items]);
  const audits = useMemo(() => audit.data ?? [], [audit.data]);
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / Math.max(data?.pageSize ?? 20, 1)));
  const title = module === "product" ? "Product" : "Service";
  return <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#06201c]">{title} reviews</h2><p className="mt-1 text-sm text-[#52736a]">Customer ratings and feedback for your {module === "product" ? "products" : "services"}.</p></div><button type="button" onClick={() => setShowHistory(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58]">Moderation History</button></header>
    <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label={`${title} review status`}>{(["all", "approved", "pending", "rejected"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={status === value} onClick={() => { setStatus(value); setPage(1); }} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === value ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{value === "all" ? "All" : value === "approved" ? "Published" : value[0]?.toUpperCase() + value.slice(1)} ({data?.counts[value] ?? 0})</button>)}
      <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#52736a]">Rating<select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm"><option value="all">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">Search<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Comment or reviewer" className="h-10 w-48 rounded-xl border border-[#d7e5df] px-3 text-sm" /></label>
    </div>
    <p className="mt-2 text-xs text-[#68867c]">All includes Pending, Published, and Rejected reviews. Pending shows reviews awaiting moderation.</p>
    {query.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">Loading reviews…</p> : null}
    {query.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{query.error instanceof Error ? query.error.message : "Unable to load reviews."} <button type="button" onClick={() => void query.refetch()} className="font-bold underline">Try again</button></p> : null}
    {data && data.items.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No {title.toLowerCase()} reviews match these filters.</p> : null}
    {data?.items.length ? <div className="mt-4 grid gap-3">{data.items.map((review) => <ReviewCardLayout key={review.id} focused={review.id === reviewId} item={<Link href={`/admin/${module}s/${encodeURIComponent(review.itemId)}?tab=reviews`} title={review.itemName} className="font-semibold text-[#1f6a58] underline"><ReviewItemName fullName={review.itemName}>{review.itemName}</ReviewItemName></Link>} reviewer={<ReviewerIdentity name={review.reviewerName} email={review.reviewerEmail} verified={review.verified} verifiedLabel="Verified purchase" />} rating={<span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{review.rating === null ? "Rating unavailable" : `${review.rating} ★`}</span>} status={<span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#52736a]">{review.status === "approved" ? "Published" : review.status[0]?.toUpperCase() + review.status.slice(1)}</span>} date={<time>{reviewDateLabel(review)}</time>}><ReviewComment comment={review.comment} /></ReviewCardLayout>)}</div> : null}
    {data && data.total > data.pageSize ? <nav aria-label="Review pagination" className="mt-4 flex items-center justify-between"><p className="text-sm text-[#52736a]">Page {data.page} of {pageCount}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage((current) => current - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm disabled:opacity-50">Previous</button><button type="button" disabled={page >= pageCount || query.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm disabled:opacity-50">Next</button></div></nav> : null}
    {showHistory ? <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHistory(false); }}><section role="dialog" aria-modal="true" aria-labelledby="catalog-review-audit-title" className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"><div className="flex justify-between gap-3"><h3 id="catalog-review-audit-title" className="text-lg font-bold">{title} review moderation history</h3><button type="button" onClick={() => setShowHistory(false)} className="font-semibold text-[#52736a]">Close</button></div>{audit.isLoading ? <p className="mt-4">Loading history…</p> : null}{audit.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">Unable to load history. <button type="button" onClick={() => void audit.refetch()} className="font-bold underline">Try again</button></p> : null}{audits.length ? <div className="mt-4 grid gap-3">{audits.map((entry) => <article key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3"><p className="font-semibold">{entry.itemName ?? `${title} review`} · {entry.toStatus}</p><p className="mt-1 text-sm text-[#52736a]">{entry.customerName ?? "Customer"} · {entry.actorName ?? "Super Admin"} · {dateLabel(entry.createdAt)}</p>{entry.reason ? <p className="mt-2 text-sm">Reason: {entry.reason}</p> : null}</article>)}</div> : audit.data ? <p className="mt-4 text-sm text-[#52736a]">No moderation history is available.</p> : null}</section></div> : null}
  </section>;
}
