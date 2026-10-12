import type { PlatformReviewAuditEntry, PlatformReviewQueueItem, PlatformReviewsManageResponse, PlatformReviewsParams, ReviewModerationStatus, ReviewModule, StarRating } from "./platform-reviews.types";

const MODULES: readonly ReviewModule[] = ["training", "event", "product", "service"];
const STATUSES: readonly ReviewModerationStatus[] = ["pending", "approved", "rejected"];
const RATINGS: readonly StarRating[] = [1, 2, 3, 4, 5];

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

/** Validates a review rating as a whole number from one through five. */
export function validateRating(rating: unknown): asserts rating is StarRating {
  if (typeof rating !== "number" || !Number.isInteger(rating) || !RATINGS.includes(rating as StarRating)) throw new Error("Choose a whole-number rating from 1 to 5 stars.");
}

/** Validates an optional review comment against the API's 2,000 character limit. */
export function validateComment(comment: unknown): void {
  if (comment == null) return;
  if (typeof comment !== "string") throw new Error("Review comments must be text.");
  if (comment.length > 2000) throw new Error("Review comments must be 2,000 characters or fewer.");
}

/** Returns a module-appropriate display name without exposing email as a name. */
export function sanitizePlatformReviewerName(name: unknown, module: ReviewModule, _email?: unknown): string {
  if (typeof name === "string" && name.trim() && !name.includes("@")) return name.trim();
  return module === "training" ? "Learner" : module === "event" ? "Attendee" : "Customer";
}

/** Appends an explicit UTC zone to a server timestamp when it omits one. */
export function normalizeUtcDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const timestamp = value.trim();
  return /^\d{4}-\d{2}-\d{2}T/.test(timestamp) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) ? `${timestamp}Z` : timestamp;
}

/** Validates and normalizes one review queue item from backend response shapes. */
export function parsePlatformReviewItem(raw: unknown): PlatformReviewQueueItem {
  if (!isRecord(raw)) throw new Error("Reviews API returned an invalid review.");
  const module = raw.module;
  if (typeof module !== "string" || !MODULES.includes(module as ReviewModule)) throw new Error("Reviews API returned an unsupported review module.");
  const reviewId = raw.review_id ?? raw.id;
  const itemId = raw.item_id ?? raw.training_id ?? raw.event_id;
  if (typeof reviewId !== "string" || !reviewId.trim() || typeof itemId !== "string" || !itemId.trim()) throw new Error("Reviews API returned a review without its identifier.");
  const rawRating = raw.rating;
  const rating = typeof rawRating === "number" && Number.isInteger(rawRating) && RATINGS.includes(rawRating as StarRating) ? rawRating as StarRating : null;
  const rawStatus = raw.moderation_status ?? raw.status;
  const moderationStatus = typeof rawStatus === "string" && STATUSES.includes(rawStatus as ReviewModerationStatus) ? rawStatus as ReviewModerationStatus : "approved";
  const email = typeof (raw.reviewer_email ?? raw.participant_email) === "string" ? String(raw.reviewer_email ?? raw.participant_email) : null;
  const name = raw.reviewer_name ?? raw.participant_name;
  return {
    review_id: reviewId,
    item_id: itemId,
    item_name: typeof (raw.item_name ?? raw.training_title ?? raw.event_title) === "string" ? String(raw.item_name ?? raw.training_title ?? raw.event_title) : "Untitled item",
    module: module as ReviewModule,
    business_name: typeof raw.business_name === "string" ? raw.business_name : "Business unavailable",
    tenant_id: typeof raw.tenant_id === "string" ? raw.tenant_id : null,
    rating,
    comment: typeof raw.comment === "string" ? raw.comment : null,
    reviewer_name: sanitizePlatformReviewerName(name, module as ReviewModule, email),
    reviewer_email: email,
    is_verified: raw.is_verified === true || raw.verified === true,
    moderation_status: moderationStatus,
    created_at: normalizeUtcDate(typeof raw.created_at === "string" ? raw.created_at : null),
    updated_at: normalizeUtcDate(typeof raw.updated_at === "string" ? raw.updated_at : null),
  };
}

/** Parses and validates a Reviews manage page including status counts. */
export function parsePlatformReviewsManageResponse(raw: unknown, pageFallback = 1, pageSizeFallback = 20): PlatformReviewsManageResponse {
  if (!isRecord(raw) || !Array.isArray(raw.items)) throw new Error("Reviews API returned an invalid queue response.");
  const items = raw.items.map(parsePlatformReviewItem);
  const counts = isRecord(raw.counts) ? raw.counts : {};
  const pagination = isRecord(raw.pagination) ? raw.pagination : {};
  const numberOr = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pending = numberOr(counts.pending, items.filter((item) => item.moderation_status === "pending").length);
  const approved = numberOr(counts.approved, items.filter((item) => item.moderation_status === "approved").length);
  const rejected = numberOr(counts.rejected, items.filter((item) => item.moderation_status === "rejected").length);
  return { items, counts: { pending, approved, rejected, all: numberOr(counts.all, pending + approved + rejected) }, pagination: { page: numberOr(pagination.page, pageFallback), page_size: numberOr(pagination.page_size, pageSizeFallback), total: numberOr(pagination.total, items.length), total_pages: numberOr(pagination.total_pages, 1) } };
}

/** Fetches the globally scoped review queue for a module. */
export async function listPlatformReviewsManage(params: PlatformReviewsParams): Promise<PlatformReviewsManageResponse> {
  const query = new URLSearchParams({ module: params.module, page: String(params.page ?? 1), page_size: String(params.pageSize ?? 20) });
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.rating && params.rating !== "all") query.set("rating", String(params.rating));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.itemId) query.set("item_id", params.itemId);
  const response = await fetch(`/api/platform-super-admin/reviews/manage?${query}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw await platformReviewError(response, "Unable to load reviews.");
  return parsePlatformReviewsManageResponse(await response.json(), params.page ?? 1, params.pageSize ?? 20);
}

/** Applies a moderation action to a review in any platform module. */
export async function moderatePlatformReview(module: ReviewModule, reviewId: string, action: ReviewModerationStatus): Promise<void> {
  const response = await fetch(`/api/platform-super-admin/reviews/${module}/${encodeURIComponent(reviewId)}/moderate`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
  if (!response.ok) throw await platformReviewError(response, "Unable to update this review.");
}

/** Permanently deletes a review in any platform module. */
export async function deletePlatformReview(module: ReviewModule, reviewId: string): Promise<void> {
  const response = await fetch(`/api/platform-super-admin/reviews/${module}/${encodeURIComponent(reviewId)}`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw await platformReviewError(response, "Unable to delete this review.");
}

/** Loads platform-wide moderation audit history, optionally filtered to an item. */
export async function getPlatformReviewsAudit(module: ReviewModule, itemId?: string): Promise<PlatformReviewAuditEntry[]> {
  const query = new URLSearchParams({ module });
  if (itemId) query.set("item_id", itemId);
  const response = await fetch(`/api/platform-super-admin/reviews/audit?${query}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw await platformReviewError(response, "Unable to load review history.");
  const raw = await response.json() as unknown;
  const auditItems = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.items) ? raw.items : isRecord(raw) && Array.isArray(raw.audit) ? raw.audit : null;
  if (!auditItems) throw new Error("Reviews API returned invalid audit history.");
  return auditItems.flatMap((item, index): PlatformReviewAuditEntry[] => {
    if (!isRecord(item) || typeof item.review_id !== "string" || typeof item.item_id !== "string" || typeof item.to_status !== "string") return [];
    return [{ id: typeof item.id === "string" ? item.id : `audit-${index}`, module, review_id: item.review_id, item_id: item.item_id, item_name: typeof item.item_name === "string" ? item.item_name : null, from_status: typeof item.from_status === "string" ? item.from_status : null, to_status: item.to_status, actor_name: typeof item.actor_name === "string" ? item.actor_name : null, actor_user_id: typeof item.actor_user_id === "string" ? item.actor_user_id : null, actor_role: typeof item.actor_role === "string" ? item.actor_role : null, created_at: normalizeUtcDate(typeof item.created_at === "string" ? item.created_at : null) }];
  });
}

async function platformReviewError(response: Response, fallback: string): Promise<Error> {
  const body: unknown = await response.json().catch(() => null);
  const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : null;
  if (response.status === 401) return new Error("Super Admin authentication is required.");
  if (response.status === 403) return new Error("You do not have permission to manage reviews.");
  return new Error(detail ?? fallback);
}
