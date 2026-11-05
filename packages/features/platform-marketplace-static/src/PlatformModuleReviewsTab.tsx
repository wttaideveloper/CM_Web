"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlatformEnterprises } from "@ihp/platform-enterprises";
import { ReviewCardLayout, ReviewItemName, ReviewerIdentity } from "@ihp/ui";
import { deletePlatformReview, formatPlatformReviewAuditStatus, getPlatformReviewsAudit, latestPlatformReviewAuditEntries, listPlatformReviewsManage, matchesPlatformReviewSearch, moderatePlatformReview, normalizeUtcDate, platformReviewDisplayTimestamp } from "./platform-reviews.service";
import type { PlatformReviewAuditEntry, PlatformReviewQueueItem, ReviewModerationStatus, StarRating } from "./platform-reviews.types";
import { PlatformReviewAuditModal } from "./PlatformReviewAuditModal";
import { PlatformEventFeedbackPanel } from "./PlatformEventFeedbackPanel";
import { PlatformAllEventFeedbackPanel } from "./PlatformAllEventFeedbackPanel";

type StatusFilter = ReviewModerationStatus | "all" | "deleted";
type InitialStatus = ReviewModerationStatus | "all" | "deleted";
type QueueStatus = ReviewModerationStatus | "all";
const STATUSES: readonly StatusFilter[] = ["all", "pending", "approved", "rejected", "deleted"];
const REVIEW_PAGE_SIZE = 15;
const STATUS_CLASS: Record<ReviewModerationStatus, string> = { pending: "bg-[#fff4d6] text-[#805900]", approved: "bg-[#e8f6ee] text-[#1f6a58]", rejected: "bg-[#fff1ef] text-[#a52a20]" };
const nextStatuses = (status: ReviewModerationStatus): ReviewModerationStatus[] => status === "pending" ? ["approved", "rejected"] : status === "approved" ? ["rejected"] : ["approved"];

/** Renders a global review queue and moderation workflow for Event or Training. */
export function PlatformModuleReviewsTab({ module, itemId, reviewId, initialStatus = "approved", openAuditOnLoad = false, initialSubview = "reviews", onShowAllFeedback }: { module: "event" | "training" | "product" | "service"; itemId?: string | null; reviewId?: string | null; initialStatus?: InitialStatus; openAuditOnLoad?: boolean; initialSubview?: "reviews" | "feedback"; onShowAllFeedback?: () => void }) {
  const { t } = useTranslation("platform");
  const queryClient = useQueryClient();
  const startingStatus: StatusFilter = reviewId ? "all" : initialStatus;
  const [status, setStatus] = useState<StatusFilter>(startingStatus);
  const hasManuallySelectedStatus = useRef(false);
  const [rating, setRating] = useState<StarRating | "all">("all");
  const [business, setBusiness] = useState("all");
  const [scopedItemId, setScopedItemId] = useState(itemId ?? null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAudit, setShowAudit] = useState(openAuditOnLoad);
  const [focusedReviewId, setFocusedReviewId] = useState<string | null>(reviewId ?? null);
  const [highlightedReviewId, setHighlightedReviewId] = useState<string | null>(reviewId ?? null);
  const [reasonDialog, setReasonDialog] = useState<{ kind: "reject" | "delete"; item: PlatformReviewQueueItem } | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [activeSubview, setActiveSubview] = useState<"reviews" | "feedback">(() => module === "event" ? initialSubview : "reviews");

  useEffect(() => {
    setActiveSubview(module === "event" ? initialSubview : "reviews");
  }, [module, itemId, initialSubview]);

  useEffect(() => {
    hasManuallySelectedStatus.current = false;
    setStatus(reviewId ? "all" : initialStatus);
  }, [initialStatus, reviewId]);

  useEffect(() => {
    if (openAuditOnLoad !== undefined) {
      setShowAudit(openAuditOnLoad);
    }
  }, [openAuditOnLoad]);

  useEffect(() => {
    hasManuallySelectedStatus.current = false;
    setFocusedReviewId(reviewId ?? null);
    setHighlightedReviewId(reviewId ?? null);
  }, [reviewId]);

  useEffect(() => {
    setScopedItemId(itemId ?? null);
  }, [itemId]);

  const moduleTitle = t(`reviews.modules.${module}`, { defaultValue: module === "product" ? "Product" : module === "service" ? "Service" : module === "event" ? "Event" : "Training" });
  const showingReviews = activeSubview === "reviews";
  const enterpriseQuery = useQuery({ queryKey: ["platform", "review-business-options"], queryFn: getPlatformEnterprises, enabled: showingReviews, staleTime: 300_000, retry: 1 });
  const statusCountsQuery = useQuery({
    queryKey: ["platform", "reviews", module, "status-counts", scopedItemId, business],
    queryFn: () => listPlatformReviewsManage({ module, itemId: scopedItemId ?? undefined, tenantId: business === "all" ? undefined : business, status: "all", page: 1, pageSize: 1 }),
    staleTime: 15_000,
    enabled: showingReviews,
    retry: 1,
  });
  const queryStatus: QueueStatus = (focusedReviewId && !hasManuallySelectedStatus.current)
    ? "all"
    : status === "deleted"
      ? "all"
      : status;
  const queue = useQuery({ queryKey: ["platform", "reviews", module, scopedItemId, business, queryStatus, rating, search, page], queryFn: () => listPlatformReviewsManage({ module, itemId: scopedItemId ?? undefined, tenantId: business === "all" ? undefined : business, status: queryStatus, rating, q: search.trim() || undefined, page, pageSize: REVIEW_PAGE_SIZE }), enabled: showingReviews && status !== "deleted", staleTime: 30_000, retry: 1 });
  const deletedAudit = useQuery({ queryKey: ["platform", "review-audit", module, scopedItemId, business, "deleted-rows"], queryFn: () => getPlatformReviewsAudit(module, scopedItemId ?? undefined, business === "all" ? undefined : business), enabled: showingReviews, staleTime: 30_000, retry: 1 });
  const latestDeletedAuditEntries = useMemo(() => latestPlatformReviewAuditEntries(deletedAudit.data ?? []), [deletedAudit.data]);
  const deletedReviews = useMemo(() => latestDeletedAuditEntries.filter((entry) => entry.to_status.trim().toLocaleLowerCase() === "deleted"), [latestDeletedAuditEntries]);

  useEffect(() => {
    if (!reviewId || hasManuallySelectedStatus.current) return;
    const notifiedReview = queue.data?.items.find((item) => item.review_id === reviewId);
    if (notifiedReview) {
      setStatus(notifiedReview.moderation_status);
    } else if (deletedReviews.some((entry) => entry.review_id === reviewId) || initialStatus === "deleted") {
      setStatus("deleted");
    }
  }, [queue.data?.items, deletedReviews, reviewId, initialStatus]);
  const rows = queue.data?.items ?? [];
  // The unscoped audit request above already contains audit events for this
  // result scope. Reuse it for card metadata instead of issuing one request
  // per review item on the page.
  const audit = deletedAudit;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["platform", "reviews", module] });
    void queryClient.invalidateQueries({ queryKey: ["platform", "review-audit", module] });
    for (const row of rows) {
      if (module === "training") {
        void queryClient.invalidateQueries({ queryKey: ["trainings", "platform-detail", row.item_id] });
        void queryClient.invalidateQueries({ queryKey: ["trainings", row.item_id, "reviews"] });
      } else if (module === "event") {
        void queryClient.invalidateQueries({ queryKey: ["platform", "published-event-details", row.item_id] });
        void queryClient.invalidateQueries({ queryKey: ["events", row.item_id, "reviews"] });
      }
    }
  };
  const moderate = useMutation({ mutationFn: ({ id, action, reason }: { id: string; action: ReviewModerationStatus; reason?: string }) => moderatePlatformReview(module, id, action, reason), onSuccess: refresh });
  const remove = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => deletePlatformReview(module, id, reason), onSuccess: refresh });
  const latestAuditByReviewId = useMemo(() => {
    return new Map(latestPlatformReviewAuditEntries(audit.data ?? []).map((entry) => [entry.review_id, entry]));
  }, [audit.data]);
  const rejectionReasonByReviewId = useMemo(() => {
    const latestRejection = new Map<string, PlatformReviewAuditEntry>();
    for (const entry of audit.data ?? []) {
      if (entry.to_status.trim().toLocaleLowerCase().replace(/[\s-]+/g, "_") !== "rejected" || !entry.reason?.trim()) continue;
      const previous = latestRejection.get(entry.review_id);
      const currentTime = entry.created_at ? Date.parse(entry.created_at) : Number.NaN;
      const previousTime = previous?.created_at ? Date.parse(previous.created_at) : Number.NaN;
      if (!previous || (Number.isFinite(currentTime) && (!Number.isFinite(previousTime) || currentTime > previousTime))) latestRejection.set(entry.review_id, entry);
    }
    return new Map([...latestRejection].map(([reviewId, entry]) => [reviewId, entry.reason?.trim() ?? ""]));
  }, [audit.data]);
  const businesses = useMemo(() => {
    const options = new Map<string, string>();
    for (const enterprise of enterpriseQuery.data ?? []) {
      if (enterprise.tenant_id) options.set(enterprise.tenant_id, enterprise.business_short_name || enterprise.business_legal_name || enterprise.name || enterprise.tenant_id);
    }
    for (const item of rows) {
      if (item.tenant_id && !options.has(item.tenant_id)) options.set(item.tenant_id, item.business_name);
    }
    return [...options.entries()].map(([tenantId, name]) => ({ tenantId, name })).sort((left, right) => left.name.localeCompare(right.name));
  }, [enterpriseQuery.data, rows]);
  const filtered = useMemo(() => rows
    .filter((item) => !focusedReviewId || item.review_id === focusedReviewId)
    .filter((item) => matchesPlatformReviewSearch(search, [item.reviewer_name, item.reviewer_email, item.business_name, item.item_name, item.comment])), [rows, focusedReviewId, search]);
  const filteredDeletedReviews = useMemo(() => {
    const matching = deletedReviews
      .filter((entry) => !focusedReviewId || entry.review_id === focusedReviewId)
      .filter((entry) => rating === "all" || entry.rating === rating)
      .filter((entry) => matchesPlatformReviewSearch(search, [entry.business_name, entry.customer_name, entry.item_name, entry.comment]));
    if (matching.length > 0) return matching;
    if (focusedReviewId && deletedReviews.length > 0) {
      return deletedReviews.filter((entry) => rating === "all" || entry.rating === rating);
    }
    return matching;
  }, [deletedReviews, focusedReviewId, rating, search]);
  const counts = statusCountsQuery.data?.counts;
  const statusCount = (value: number | undefined) => statusCountsQuery.isFetching ? "…" : value ?? (statusCountsQuery.isError ? "—" : "…");
  const deletedCount = deletedAudit.isFetching ? "…" : deletedAudit.data ? deletedReviews.length : deletedAudit.isError ? "—" : "…";
  const showingDeleted = status === "deleted";
  const pagination = queue.data?.pagination;
  const deletedPageCount = Math.max(1, Math.ceil(filteredDeletedReviews.length / REVIEW_PAGE_SIZE));
  const displayedDeletedReviews = useMemo(() => filteredDeletedReviews.slice((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE), [filteredDeletedReviews, page]);
  const visiblePageCount = showingDeleted ? deletedPageCount : pagination?.total_pages ?? 1;
  const hasActiveFilters = status !== "all" || rating !== "all" || business !== "all" || Boolean(search.trim()) || page !== 1 || Boolean(focusedReviewId) || scopedItemId !== (itemId ?? null);
  const clearFilters = () => {
    hasManuallySelectedStatus.current = true;
    setStatus("all");
    setRating("all");
    setBusiness("all");
    setSearch("");
    setPage(1);
    setFocusedReviewId(null);
    setHighlightedReviewId(null);
    setScopedItemId(itemId ?? null);
  };
  const action = (item: PlatformReviewQueueItem, next: ReviewModerationStatus) => { if (next === "rejected") { setModerationReason(""); setReasonDialog({ kind: "reject", item }); return; } moderate.mutate({ id: item.review_id, action: next }); };
  const removeItem = (item: PlatformReviewQueueItem) => { setModerationReason(""); setReasonDialog({ kind: "delete", item }); };
  const submitReason = () => {
    const reason = moderationReason.trim();
    if (!reason || !reasonDialog) return;
    if (reasonDialog.kind === "reject") moderate.mutate({ id: reasonDialog.item.review_id, action: "rejected", reason }, { onSuccess: () => setReasonDialog(null) });
    else remove.mutate({ id: reasonDialog.item.review_id, reason }, { onSuccess: () => setReasonDialog(null) });
  };

  useEffect(() => {
    if (!focusedReviewId || queue.isLoading) return;
    const target = document.getElementById(`platform-review-${focusedReviewId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedReviewId, queue.isLoading, deletedAudit.isLoading, showingDeleted, filtered, filteredDeletedReviews]);

  useEffect(() => {
    if (!showingDeleted || !focusedReviewId) return;
    const targetIndex = filteredDeletedReviews.findIndex((entry) => entry.review_id === focusedReviewId || entry.id === focusedReviewId);
    if (targetIndex >= 0) setPage(Math.floor(targetIndex / REVIEW_PAGE_SIZE) + 1);
  }, [showingDeleted, focusedReviewId, filteredDeletedReviews]);

  useEffect(() => {
    if (!focusedReviewId || highlightedReviewId !== focusedReviewId) return;
    if (showingDeleted ? deletedAudit.isLoading : queue.isLoading) return;
    if (!document.getElementById(`platform-review-${focusedReviewId}`)) return;
    // Keep the exact notified review filtered in view, but make the visual
    // notification highlight temporary so it does not look permanently selected.
    const timeout = window.setTimeout(() => {
      setHighlightedReviewId((current) => current === focusedReviewId ? null : current);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [focusedReviewId, highlightedReviewId, queue.isLoading, deletedAudit.isLoading, showingDeleted, filtered, filteredDeletedReviews]);

  return <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-[#06201c]">{activeSubview === "feedback" ? "Mobile Attendee Feedback" : t("reviews.receivedTitle", { module: moduleTitle })}</h3><p className="mt-1 text-sm text-[#52736a]">{activeSubview === "feedback" ? "Private feedback submitted by attendees in the mobile app." : t("reviews.receivedDescription", { module: moduleTitle.toLowerCase() })}</p></div>{activeSubview === "reviews" ? <button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">{t("reviews.audit.button")}</button> : null}</header>
    {module === "event" ? <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Event reviews and feedback"><button type="button" role="tab" aria-selected={activeSubview === "reviews"} onClick={() => setActiveSubview("reviews")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${activeSubview === "reviews" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>Public Reviews</button><button type="button" role="tab" aria-selected={activeSubview === "feedback"} onClick={() => setActiveSubview("feedback")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${activeSubview === "feedback" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>Mobile Attendee Feedback</button></div> : null}
    {module === "event" && activeSubview === "feedback" ? itemId ? <PlatformEventFeedbackPanel eventId={itemId} onShowAllFeedback={onShowAllFeedback} /> : <PlatformAllEventFeedbackPanel /> : null}
    <div hidden={module === "event" && activeSubview === "feedback"}>
    {moderate.isError || remove.isError ? <p role="alert" className="mt-3 rounded-lg border border-[#f3c7c3] bg-[#fff5f4] px-3 py-2 text-sm text-[#b42318]">{(moderate.error ?? remove.error as Error).message}</p> : null}
    {focusedReviewId ? (
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#e8f6ee] px-4 py-2.5 text-xs font-semibold text-[#1f6a58]">
        <span>Filtering to notified review</span>
        <button type="button" onClick={() => { setFocusedReviewId(null); setHighlightedReviewId(null); setScopedItemId(null); }} className="font-bold underline hover:text-[#164e41]">Show all reviews</button>
      </div>
    ) : null}
    <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label={t("reviews.filterStatus")}>{STATUSES.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => { hasManuallySelectedStatus.current = true; setFocusedReviewId(null); setHighlightedReviewId(null); setScopedItemId(null); setStatus(item); setPage(1); }} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === item ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{item === "deleted" ? t("reviews.status.deleted", { defaultValue: "Deleted" }) : t(`reviews.status.${item}`)} ({item === "deleted" ? deletedCount : statusCount(counts?.[item])})</button>)}
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.business")}<select value={business} onChange={(event) => { setBusiness(event.target.value); setFocusedReviewId(null); setScopedItemId(null); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">{t("reviews.allBusinesses")}</option>{businesses.map((option) => <option key={option.tenantId} value={option.tenantId}>{option.name}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.rating")}<select value={rating} onChange={(event) => { setRating(event.target.value === "all" ? "all" : Number(event.target.value) as StarRating); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">{t("reviews.allRatings")}</option>{([5, 4, 3, 2, 1] as const).map((value) => <option key={value} value={value}>{value} ★</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.search")}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("reviews.searchPlaceholder")} className="h-10 w-64 rounded-xl border border-[#d7e5df] px-3 text-sm text-[#06201c]" /></label>
      <button type="button" onClick={clearFilters} disabled={!hasActiveFilters} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">{t("reviews.clearFilters", { defaultValue: "Clear filters" })}</button>
    </div>
    <p className="mt-2 text-xs text-[#68867c]">All includes Pending, Published, and Rejected reviews. Pending shows reviews awaiting moderation. Deleted reviews are listed separately.</p>
    {!showingDeleted && queue.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">{t("reviews.loading")}</p> : null}
    {!showingDeleted && queue.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(queue.error as Error).message} <button type="button" onClick={() => void queue.refetch()} className="font-bold underline">{t("reviews.retry")}</button></p> : null}
    {showingDeleted && deletedAudit.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">{t("reviews.loading")}</p> : null}
    {showingDeleted && deletedAudit.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(deletedAudit.error as Error).message} <button type="button" onClick={() => void deletedAudit.refetch()} className="font-bold underline">{t("reviews.retry")}</button></p> : null}
    {!showingDeleted && !queue.isLoading && !queue.isError && !filtered.length ? <p className="mt-4 text-sm text-[#52736a]">{t("reviews.empty")}</p> : null}
    {showingDeleted && !deletedAudit.isLoading && !deletedAudit.isError && !filteredDeletedReviews.length ? <p className="mt-4 text-sm text-[#52736a]">{t("reviews.deletedEmpty", { defaultValue: "No deleted reviews match these filters." })}</p> : null}
    {!showingDeleted && filtered.length ? <div className="mt-4 grid gap-3">{filtered.map((item) => <ReviewRow key={item.review_id} item={item} latestAudit={latestAuditByReviewId.get(item.review_id) ?? null} rejectionReason={item.reason?.trim() || rejectionReasonByReviewId.get(item.review_id)} busy={moderate.isPending || remove.isPending} isFocused={Boolean(highlightedReviewId && item.review_id === highlightedReviewId)} onExpand={() => setHighlightedReviewId(null)} onAction={(next) => action(item, next)} onDelete={() => removeItem(item)} />)}</div> : null}
    {showingDeleted && displayedDeletedReviews.length ? <div className="mt-4 grid gap-3">{displayedDeletedReviews.map((entry) => <DeletedReviewRow key={entry.id} entry={entry} moduleTitle={moduleTitle} isFocused={Boolean(highlightedReviewId && entry.review_id === highlightedReviewId)} />)}</div> : null}
    {visiblePageCount > 1 ? <nav aria-label={t("reviews.pagination.label")} className="mt-5 flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm text-[#52736a]">{t("reviews.pagination.page", { page: showingDeleted ? page : pagination?.page ?? page, pages: visiblePageCount })}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || (showingDeleted ? deletedAudit.isFetching : queue.isFetching)} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">{t("reviews.pagination.previous")}</button><button type="button" disabled={page >= visiblePageCount || (showingDeleted ? deletedAudit.isFetching : queue.isFetching)} onClick={() => setPage((current) => Math.min(visiblePageCount, current + 1))} className="rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{t("reviews.pagination.next")}</button></div></nav> : null}
    {reasonDialog ? <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !moderate.isPending && !remove.isPending) setReasonDialog(null); }}><section role="dialog" aria-modal="true" aria-labelledby="review-reason-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"><h2 id="review-reason-title" className="text-lg font-bold text-[#06201c]">{reasonDialog.kind === "reject" ? t("reviews.reason.rejectTitle", { defaultValue: "Reject this review" }) : t("reviews.reason.deleteTitle", { defaultValue: "Delete this review?" })}</h2><p className="mt-2 text-sm text-[#52736a]">{reasonDialog.kind === "reject" ? t("reviews.reason.rejectDescription", { name: reasonDialog.item.reviewer_name, defaultValue: `Explain why ${reasonDialog.item.reviewer_name}'s review is being rejected. The reason will be shared with the Enterprise and review author.` }) : t("reviews.reason.deleteDescription", { name: reasonDialog.item.reviewer_name, defaultValue: `This permanently removes ${reasonDialog.item.reviewer_name}'s review from active review lists. Enter a reason for the audit history and notification.` })}</p><label htmlFor="review-moderation-reason" className="mt-4 block text-sm font-semibold text-[#31594d]">{t("reviews.reason.label", { defaultValue: "Reason" })}</label><textarea id="review-moderation-reason" value={moderationReason} onChange={(event) => setModerationReason(event.target.value.slice(0, 500))} rows={4} maxLength={500} autoFocus disabled={moderate.isPending || remove.isPending} aria-describedby="review-reason-hint" className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 disabled:opacity-60" /><div id="review-reason-hint" className="mt-1 flex justify-between text-xs text-[#7f9d94]"><span>Enter 3 to 500 characters.</span><span>{moderationReason.trim().length}/500</span></div>{moderate.isError || remove.isError ? <p role="alert" className="mt-3 text-sm text-[#b42318]">{(moderate.error ?? remove.error as Error).message}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={moderate.isPending || remove.isPending} onClick={() => setReasonDialog(null)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:opacity-50">{t("reviews.reason.cancel", { defaultValue: "Cancel" })}</button><button type="button" disabled={moderationReason.trim().length < 3 || moderate.isPending || remove.isPending} onClick={submitReason} className={`rounded-full px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${reasonDialog.kind === "delete" ? "bg-[#a52a20]" : "bg-[#1f6a58]"}`}>{moderate.isPending || remove.isPending ? t("reviews.reason.saving", { defaultValue: "Saving…" }) : reasonDialog.kind === "reject" ? t("reviews.reason.confirmReject", { defaultValue: "Reject review" }) : t("reviews.reason.confirmDelete", { defaultValue: "Permanently delete review" })}</button></div></section></div> : null}
    </div>
    {showAudit && activeSubview === "reviews" ? <PlatformReviewAuditModal module={module} itemId={itemId ?? undefined} reviewId={focusedReviewId ?? undefined} onClose={() => setShowAudit(false)} /> : null}
  </section>;
}

function auditActorLabel(entry: PlatformReviewAuditEntry): string {
  const roleValue = entry.actor_role?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const role = roleValue.includes("super_admin") || roleValue.includes("platform_admin") ? "Super Admin"
    : roleValue.includes("provider") ? "Provider"
      : roleValue.includes("enterprise_admin") || roleValue === "admin" ? "Enterprise Admin"
        : entry.actor_role || "Staff";
  const name = entry.actor_name && !entry.actor_name.includes("@") ? entry.actor_name : null;
  return [role, name].filter(Boolean).join(" · ");
}

function DeletedReviewRow({ entry, moduleTitle, isFocused }: { entry: PlatformReviewAuditEntry; moduleTitle: string; isFocused?: boolean }) {
  const { t } = useTranslation("platform");
  const normalizedDate = normalizeUtcDate(entry.created_at);
  const date = normalizedDate ? new Date(normalizedDate) : null;
  const dateText = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : t("reviews.dateUnavailable");
  const customerName = entry.customer_name && !entry.customer_name.includes("@") ? entry.customer_name : t("reviews.deletedCustomerFallback", { defaultValue: "Customer" });
  const normalizedPreviousStatus = entry.from_status?.trim().toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const previousStatus = normalizedPreviousStatus === "approved"
    ? t("reviews.status.approved")
    : normalizedPreviousStatus === "pending"
      ? t("reviews.status.pending")
      : normalizedPreviousStatus === "rejected"
        ? t("reviews.status.rejected")
        : normalizedPreviousStatus.replace(/_/g, " ") || t("reviews.deletedUnknownStatus", { defaultValue: "Not recorded" });
  return <article id={`platform-review-${entry.review_id}`} className={`rounded-xl border p-4 transition-all duration-300 ${isFocused ? "border-[#1f6a58] bg-[#f0f9f5] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-[#06201c]">{customerName}{isFocused ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p>
        {entry.business_name ? <p className="mt-1 text-sm font-semibold text-[#1f6a58]">{entry.business_name}</p> : null}
        <p className="mt-2 text-sm font-semibold text-[#31594d]">{entry.item_name ?? moduleTitle}</p>
        <p className="mt-2 text-xs text-[#52736a]">{t("reviews.deletedBy", { actor: auditActorLabel(entry), defaultValue: `Deleted by ${auditActorLabel(entry)}` })} <span aria-hidden="true">{"\u00b7"}</span> {dateText}</p>
        <p className="mt-1 text-xs text-[#7f9d94]">{t("reviews.deletedPreviousStatus", { status: previousStatus, defaultValue: `Previous status: ${previousStatus}` })}</p>
        {entry.reason ? <p className="mt-2 rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">{t("reviews.reason.label")}: {entry.reason}</p> : null}
      </div>
      <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#6b7f79]">{t("reviews.status.deleted", { defaultValue: "Deleted" })}</span>
    </div>
    {entry.rating !== null ? <p className="mt-3 text-xs font-semibold text-[#52736a]">{t("reviews.rating")}: {entry.rating} ★</p> : null}
    {entry.comment ? <ExpandableReviewComment comment={entry.comment} containerClassName="mt-3 rounded-lg bg-white px-3 py-2" /> : null}
  </article>;
}

function ReviewRow({ item, latestAudit, rejectionReason, busy, onExpand, onAction, onDelete, isFocused }: { item: PlatformReviewQueueItem; latestAudit: PlatformReviewAuditEntry | null; rejectionReason?: string | null; busy: boolean; onExpand: () => void; onAction: (status: ReviewModerationStatus) => void; onDelete: () => void; isFocused?: boolean }) {
  const { t } = useTranslation("platform");
  const dateValue = platformReviewDisplayTimestamp(item.created_at, item.updated_at);
  const date = dateValue ? new Date(dateValue) : null;
  const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : t("reviews.dateUnavailable");
  return <div id={`platform-review-${item.review_id}`}>
    <ReviewCardLayout focused={isFocused} item={<><p className="font-semibold text-[#1f6a58]"><ReviewItemName fullName={item.business_name}>{item.business_name}</ReviewItemName></p><p className="mt-1 font-semibold text-[#31594d]"><ReviewItemName fullName={item.item_name}>{item.item_name}</ReviewItemName></p></>} reviewer={<><ReviewerIdentity name={item.reviewer_name} email={item.reviewer_email} verified={item.is_verified} verifiedLabel={t("reviews.verified")} />{isFocused ? <span className="ml-12 mt-1 inline-block rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</>} rating={<span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{item.rating ? `${item.rating} ★` : t("reviews.ratingUnavailable")}</span>} status={<span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[item.moderation_status]}`}>{t(`reviews.status.${item.moderation_status}`)}</span>} date={<time>{dateText}</time>} latestAction={latestAudit ? <>Latest action: {formatPlatformReviewAuditStatus(latestAudit.to_status)} by {auditActorLabel(latestAudit)}</> : undefined} footer={<div className="flex flex-wrap gap-2">{nextStatuses(item.moderation_status).map((next) => <button key={next} type="button" disabled={busy} onClick={() => onAction(next)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] disabled:opacity-50">{t(`reviews.actions.${next}`)}</button>)}<button type="button" disabled={busy} onClick={onDelete} className="rounded-full border border-[#e1c9c6] px-3 py-1.5 text-xs font-bold text-[#a52a20] disabled:opacity-50">{t("reviews.actions.delete")}</button></div>}>
      <ExpandableReviewComment comment={item.comment || t("reviews.noComment", { defaultValue: "No written comment provided." })} onExpand={onExpand} />
      {item.moderation_status === "rejected" && rejectionReason?.trim() ? <p className="mt-3 rounded-lg bg-[#fff8e8] px-3 py-2 text-sm leading-6 text-[#805900]"><span className="font-semibold">{t("reviews.rejectionReason")}: </span>{rejectionReason.trim()}</p> : null}
    </ReviewCardLayout>
  </div>;
}
function ExpandableReviewComment({ comment, containerClassName, onExpand }: { comment: string; containerClassName?: string; onExpand?: () => void }) {
  const { t } = useTranslation("platform");
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (expanded) return;
    const element = contentRef.current;
    if (!element) return;

    const measureOverflow = () => setHasMore(element.scrollHeight > element.clientHeight + 1);
    measureOverflow();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measureOverflow);
    observer?.observe(element);
    window.addEventListener("resize", measureOverflow);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureOverflow);
    };
  }, [comment, expanded]);

  return <div className={containerClassName}>
    <p ref={contentRef} className={`whitespace-pre-wrap break-words text-sm leading-6 text-[#3c5d54] ${expanded ? "" : "line-clamp-2"}`}>{comment}</p>
    {hasMore ? <button type="button" onClick={() => { if (!expanded) onExpand?.(); setExpanded((current) => !current); }} aria-expanded={expanded} className="mt-1 text-sm font-semibold text-[#1f6a58] underline underline-offset-2">{expanded ? t("reviews.showLess") : t("reviews.readMore")}</button> : null}
  </div>;
}
