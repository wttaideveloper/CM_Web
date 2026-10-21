"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlatformEnterprises } from "@ihp/platform-enterprises";
import { deletePlatformReview, getPlatformReviewsAudit, listPlatformReviewsManage, moderatePlatformReview, normalizeUtcDate } from "./platform-reviews.service";
import type { PlatformReviewAuditEntry, PlatformReviewQueueItem, ReviewModerationStatus, StarRating } from "./platform-reviews.types";
import { PlatformReviewAuditModal } from "./PlatformReviewAuditModal";
import { PlatformEventFeedbackPanel } from "./PlatformEventFeedbackPanel";
import { PlatformAllEventFeedbackPanel } from "./PlatformAllEventFeedbackPanel";

type StatusFilter = Exclude<ReviewModerationStatus, "pending"> | "all" | "deleted";
type InitialStatus = ReviewModerationStatus | "all" | "deleted";
type QueueStatus = ReviewModerationStatus | "all";
const STATUSES: readonly StatusFilter[] = ["all", "approved", "rejected", "deleted"];
const STATUS_CLASS: Record<ReviewModerationStatus, string> = { pending: "bg-[#fff4d6] text-[#805900]", approved: "bg-[#e8f6ee] text-[#1f6a58]", rejected: "bg-[#fff1ef] text-[#a52a20]" };
const nextStatuses = (status: ReviewModerationStatus): ReviewModerationStatus[] => status === "pending" ? ["approved", "rejected"] : status === "approved" ? ["rejected"] : ["approved"];

/** Renders a global review queue and moderation workflow for Event or Training. */
export function PlatformModuleReviewsTab({ module, itemId, reviewId, initialStatus = "approved", openAuditOnLoad = false, initialSubview = "reviews", onShowAllFeedback }: { module: "event" | "training" | "product" | "service"; itemId?: string | null; reviewId?: string | null; initialStatus?: InitialStatus; openAuditOnLoad?: boolean; initialSubview?: "reviews" | "feedback"; onShowAllFeedback?: () => void }) {
  const { t } = useTranslation("platform");
  const queryClient = useQueryClient();
  const startingStatus: StatusFilter = initialStatus === "deleted" ? "deleted" : initialStatus === "pending" || reviewId ? "all" : initialStatus;
  const [status, setStatus] = useState<StatusFilter>(startingStatus);
  const hasManuallySelectedStatus = useRef(false);
  const [rating, setRating] = useState<StarRating | "all">("all");
  const [business, setBusiness] = useState("all");
  const [scopedItemId, setScopedItemId] = useState(itemId ?? null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [showAudit, setShowAudit] = useState(openAuditOnLoad);
  const [focusedReviewId, setFocusedReviewId] = useState<string | null>(reviewId ?? null);
  const [reasonDialog, setReasonDialog] = useState<{ kind: "reject" | "delete"; item: PlatformReviewQueueItem } | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [activeSubview, setActiveSubview] = useState<"reviews" | "feedback">(() => module === "event" ? initialSubview : "reviews");

  useEffect(() => {
    setActiveSubview(module === "event" ? initialSubview : "reviews");
  }, [module, itemId, initialSubview]);

  useEffect(() => {
    hasManuallySelectedStatus.current = false;
    setStatus(initialStatus === "deleted" ? "deleted" : initialStatus === "pending" || reviewId ? "all" : initialStatus);
  }, [initialStatus, reviewId]);

  useEffect(() => {
    if (openAuditOnLoad !== undefined) {
      setShowAudit(openAuditOnLoad);
    }
  }, [openAuditOnLoad]);

  useEffect(() => {
    hasManuallySelectedStatus.current = false;
    setFocusedReviewId(reviewId ?? null);
  }, [reviewId]);

  useEffect(() => {
    setScopedItemId(itemId ?? null);
  }, [itemId]);

  const moduleTitle = t(`reviews.modules.${module}`, { defaultValue: module === "product" ? "Product" : module === "service" ? "Service" : module === "event" ? "Event" : "Training" });
  const enterpriseQuery = useQuery({ queryKey: ["platform", "review-business-options"], queryFn: getPlatformEnterprises, staleTime: 300_000, retry: 1 });
  const queryStatus: QueueStatus = (focusedReviewId && !hasManuallySelectedStatus.current)
    ? "all"
    : status === "deleted"
      ? "all"
      : status;
  const queue = useQuery({ queryKey: ["platform", "reviews", module, scopedItemId, business, queryStatus, rating, search, page], queryFn: () => listPlatformReviewsManage({ module, itemId: scopedItemId ?? undefined, tenantId: business === "all" ? undefined : business, status: queryStatus, rating, q: search.trim() || undefined, page, pageSize: 20 }), enabled: status !== "deleted", staleTime: 15_000, refetchOnMount: "always", retry: 1 });
  const deletedAudit = useQuery({ queryKey: ["platform", "review-audit", module, scopedItemId, business, "deleted-rows"], queryFn: () => getPlatformReviewsAudit(module, scopedItemId ?? undefined, business === "all" ? undefined : business), staleTime: 15_000, retry: 1 });
  const deletedReviews = useMemo(() => (deletedAudit.data ?? []).filter((entry) => entry.to_status.trim().toLocaleLowerCase() === "deleted"), [deletedAudit.data]);

  useEffect(() => {
    if (!reviewId || hasManuallySelectedStatus.current) return;
    const notifiedReview = queue.data?.items.find((item) => item.review_id === reviewId);
    if (notifiedReview) {
      setStatus(notifiedReview.moderation_status === "pending" ? "all" : notifiedReview.moderation_status);
    } else if (deletedReviews.some((entry) => entry.review_id === reviewId) || initialStatus === "deleted") {
      setStatus("deleted");
    }
  }, [queue.data?.items, deletedReviews, reviewId, initialStatus]);
  const rows = queue.data?.items ?? [];
  const auditItemIds = useMemo(() => [...new Set(rows.map((item) => item.item_id).filter(Boolean))], [rows]);
  const audit = useQuery({ queryKey: ["platform", "review-audit", module, "items", auditItemIds], queryFn: async () => (await Promise.all(auditItemIds.map((id) => getPlatformReviewsAudit(module, id)))).flat(), enabled: auditItemIds.length > 0, staleTime: 15_000, retry: 1 });
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
    const latest = new Map<string, PlatformReviewAuditEntry>();
    for (const entry of audit.data ?? []) {
      if (!latest.has(entry.review_id)) latest.set(entry.review_id, entry);
    }
    return latest;
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
  const filtered = useMemo(() => rows.filter((item) => !focusedReviewId || item.review_id === focusedReviewId).filter((item) => { if (!search.trim()) return true; const term = search.trim().toLowerCase(); return [item.comment, item.item_name, item.reviewer_name].some((value) => value?.toLowerCase().includes(term)); }), [rows, focusedReviewId, search]);
  const filteredDeletedReviews = useMemo(() => {
    const matching = deletedReviews
      .filter((entry) => !focusedReviewId || entry.review_id === focusedReviewId)
      .filter((entry) => rating === "all" || entry.rating === rating)
      .filter((entry) => {
        if (!search.trim()) return true;
        const term = search.trim().toLocaleLowerCase();
        return [entry.business_name, entry.customer_name, entry.item_name, entry.comment, entry.review_id]
          .some((value) => value?.toLocaleLowerCase().includes(term));
      });
    if (matching.length > 0) return matching;
    if (focusedReviewId && deletedReviews.length > 0) {
      return deletedReviews.filter((entry) => rating === "all" || entry.rating === rating);
    }
    return matching;
  }, [deletedReviews, focusedReviewId, rating, search]);
  const counts = queue.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const showingDeleted = status === "deleted";
  const pagination = queue.data?.pagination;
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
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusedReviewId, queue.isLoading, filtered, filteredDeletedReviews]);

  return <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-[#06201c]">{activeSubview === "feedback" ? "Mobile Attendee Feedback" : t("reviews.receivedTitle", { module: moduleTitle })}</h3><p className="mt-1 text-sm text-[#52736a]">{activeSubview === "feedback" ? "Private feedback submitted by attendees in the mobile app." : t("reviews.receivedDescription", { module: moduleTitle.toLowerCase() })}</p></div>{activeSubview === "reviews" ? <button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">{t("reviews.audit.button")}</button> : null}</header>
    {module === "event" ? <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Event reviews and feedback"><button type="button" role="tab" aria-selected={activeSubview === "reviews"} onClick={() => setActiveSubview("reviews")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${activeSubview === "reviews" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>Public Reviews</button><button type="button" role="tab" aria-selected={activeSubview === "feedback"} onClick={() => setActiveSubview("feedback")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${activeSubview === "feedback" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>Mobile Attendee Feedback</button></div> : null}
    {module === "event" && activeSubview === "feedback" ? itemId ? <PlatformEventFeedbackPanel eventId={itemId} onShowAllFeedback={onShowAllFeedback} /> : <PlatformAllEventFeedbackPanel /> : null}
    <div hidden={module === "event" && activeSubview === "feedback"}>
    {moderate.isError || remove.isError ? <p role="alert" className="mt-3 rounded-lg border border-[#f3c7c3] bg-[#fff5f4] px-3 py-2 text-sm text-[#b42318]">{(moderate.error ?? remove.error as Error).message}</p> : null}
    {focusedReviewId ? (
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#e8f6ee] px-4 py-2.5 text-xs font-semibold text-[#1f6a58]">
        <span>Filtering to notified review</span>
        <button type="button" onClick={() => { setFocusedReviewId(null); setScopedItemId(null); }} className="font-bold underline hover:text-[#164e41]">Show all reviews</button>
      </div>
    ) : null}
    <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label={t("reviews.filterStatus")}>{STATUSES.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => { hasManuallySelectedStatus.current = true; setFocusedReviewId(null); setScopedItemId(null); setStatus(item); setPage(1); }} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === item ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{item === "deleted" ? t("reviews.status.deleted", { defaultValue: "Deleted" }) : t(`reviews.status.${item}`)} ({item === "deleted" ? deletedReviews.length : counts[item] ?? 0})</button>)}
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.business")}<select value={business} onChange={(event) => { setBusiness(event.target.value); setFocusedReviewId(null); setScopedItemId(null); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">{t("reviews.allBusinesses")}</option>{businesses.map((option) => <option key={option.tenantId} value={option.tenantId}>{option.name}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.rating")}<select value={rating} onChange={(event) => { setRating(event.target.value === "all" ? "all" : Number(event.target.value) as StarRating); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">{t("reviews.allRatings")}</option>{([5, 4, 3, 2, 1] as const).map((value) => <option key={value} value={value}>{value} ★</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.search")}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("reviews.searchPlaceholder")} className="h-10 w-48 rounded-xl border border-[#d7e5df] px-3 text-sm text-[#06201c]" /></label>
    </div>
    {!showingDeleted && queue.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">{t("reviews.loading")}</p> : null}
    {!showingDeleted && queue.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(queue.error as Error).message} <button type="button" onClick={() => void queue.refetch()} className="font-bold underline">{t("reviews.retry")}</button></p> : null}
    {showingDeleted && deletedAudit.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">{t("reviews.loading")}</p> : null}
    {showingDeleted && deletedAudit.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(deletedAudit.error as Error).message} <button type="button" onClick={() => void deletedAudit.refetch()} className="font-bold underline">{t("reviews.retry")}</button></p> : null}
    {!showingDeleted && !queue.isLoading && !queue.isError && !filtered.length ? <p className="mt-4 text-sm text-[#52736a]">{t("reviews.empty")}</p> : null}
    {showingDeleted && !deletedAudit.isLoading && !deletedAudit.isError && !filteredDeletedReviews.length ? <p className="mt-4 text-sm text-[#52736a]">{t("reviews.deletedEmpty", { defaultValue: "No deleted reviews match these filters." })}</p> : null}
    {!showingDeleted && filtered.length ? <div className="mt-4 grid gap-3">{filtered.map((item) => <ReviewRow key={item.review_id} item={item} latestAudit={latestAuditByReviewId.get(item.review_id) ?? null} expanded={expanded.has(item.review_id)} busy={moderate.isPending || remove.isPending} isFocused={Boolean(focusedReviewId && item.review_id === focusedReviewId)} onToggle={() => setExpanded((current) => { const next = new Set(current); next.has(item.review_id) ? next.delete(item.review_id) : next.add(item.review_id); return next; })} onAction={(next) => action(item, next)} onDelete={() => removeItem(item)} />)}</div> : null}
    {showingDeleted && filteredDeletedReviews.length ? <div className="mt-4 grid gap-3">{filteredDeletedReviews.map((entry) => <DeletedReviewRow key={entry.id} entry={entry} moduleTitle={moduleTitle} isFocused={Boolean(focusedReviewId && entry.review_id === focusedReviewId)} />)}</div> : null}
    {pagination && pagination.total_pages > 1 ? <nav aria-label={t("reviews.pagination.label")} className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#52736a]">{t("reviews.pagination.page", { page: pagination.page, pages: pagination.total_pages })}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || queue.isFetching} onClick={() => setPage((current) => current - 1)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm disabled:opacity-50">{t("reviews.pagination.previous")}</button><button type="button" disabled={page >= pagination.total_pages || queue.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{t("reviews.pagination.next")}</button></div></nav> : null}
    {reasonDialog ? <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !moderate.isPending && !remove.isPending) setReasonDialog(null); }}><section role="dialog" aria-modal="true" aria-labelledby="review-reason-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"><h2 id="review-reason-title" className="text-lg font-bold text-[#06201c]">{reasonDialog.kind === "reject" ? t("reviews.reason.rejectTitle", { defaultValue: "Reject this review" }) : t("reviews.reason.deleteTitle", { defaultValue: "Delete this review?" })}</h2><p className="mt-2 text-sm text-[#52736a]">{reasonDialog.kind === "reject" ? t("reviews.reason.rejectDescription", { name: reasonDialog.item.reviewer_name, defaultValue: `Explain why ${reasonDialog.item.reviewer_name}'s review is being rejected. The reason will be shared with the Enterprise and review author.` }) : t("reviews.reason.deleteDescription", { name: reasonDialog.item.reviewer_name, defaultValue: `This permanently removes ${reasonDialog.item.reviewer_name}'s review from active review lists. Enter a reason for the audit history and notification.` })}</p><label htmlFor="review-moderation-reason" className="mt-4 block text-sm font-semibold text-[#31594d]">{t("reviews.reason.label", { defaultValue: "Reason (required)" })}</label><textarea id="review-moderation-reason" value={moderationReason} onChange={(event) => setModerationReason(event.target.value.slice(0, 500))} rows={4} maxLength={500} autoFocus disabled={moderate.isPending || remove.isPending} aria-describedby="review-reason-hint" className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 disabled:opacity-60" /><div id="review-reason-hint" className="mt-1 flex justify-between text-xs text-[#7f9d94]"><span>Enter 3 to 500 characters.</span><span>{moderationReason.trim().length}/500</span></div>{moderate.isError || remove.isError ? <p role="alert" className="mt-3 text-sm text-[#b42318]">{(moderate.error ?? remove.error as Error).message}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={moderate.isPending || remove.isPending} onClick={() => setReasonDialog(null)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:opacity-50">{t("reviews.reason.cancel", { defaultValue: "Cancel" })}</button><button type="button" disabled={moderationReason.trim().length < 3 || moderate.isPending || remove.isPending} onClick={submitReason} className={`rounded-full px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${reasonDialog.kind === "delete" ? "bg-[#a52a20]" : "bg-[#1f6a58]"}`}>{moderate.isPending || remove.isPending ? t("reviews.reason.saving", { defaultValue: "Saving…" }) : reasonDialog.kind === "reject" ? t("reviews.reason.confirmReject", { defaultValue: "Reject review" }) : t("reviews.reason.confirmDelete", { defaultValue: "Permanently delete review" })}</button></div></section></div> : null}
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
        <p className="mt-1 break-all text-xs text-[#7f9d94]">{t("reviews.audit.reviewId", { id: entry.review_id, defaultValue: `Review ID: ${entry.review_id}` })}</p>
        <p className="mt-2 text-xs text-[#52736a]">{t("reviews.deletedBy", { actor: auditActorLabel(entry), defaultValue: `Deleted by ${auditActorLabel(entry)}` })} <span aria-hidden="true">{"\u00b7"}</span> {dateText}</p>
        <p className="mt-1 text-xs text-[#7f9d94]">{t("reviews.deletedPreviousStatus", { status: previousStatus, defaultValue: `Previous status: ${previousStatus}` })}</p>
        {entry.reason ? <p className="mt-2 rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">{t("reviews.reason.label")}: {entry.reason}</p> : null}
      </div>
      <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#6b7f79]">{t("reviews.status.deleted", { defaultValue: "Deleted" })}</span>
    </div>
    {entry.rating !== null ? <p className="mt-3 text-xs font-semibold text-[#52736a]">{t("reviews.rating")}: {entry.rating} ★</p> : null}
    {entry.comment ? <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm leading-6 text-[#3c5d54]">{entry.comment}</p> : null}
  </article>;
}

function ReviewRow({ item, latestAudit, expanded, busy, onToggle, onAction, onDelete, isFocused }: { item: PlatformReviewQueueItem; latestAudit: PlatformReviewAuditEntry | null; expanded: boolean; busy: boolean; onToggle: () => void; onAction: (status: ReviewModerationStatus) => void; onDelete: () => void; isFocused?: boolean }) {
  const { t } = useTranslation("platform");
  const isLong = (item.comment?.length ?? 0) > 240;
  const dateValue = normalizeUtcDate(item.created_at);
  const date = dateValue ? new Date(dateValue) : null;
  const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : t("reviews.dateUnavailable");
  const itemHref = item.module === "training" ? `/trainings?reviewItem=${encodeURIComponent(item.item_id)}&review_id=${encodeURIComponent(item.review_id)}&status=${encodeURIComponent(item.moderation_status)}` : item.module === "event" ? `/events?reviewItem=${encodeURIComponent(item.item_id)}&review_id=${encodeURIComponent(item.review_id)}&status=${encodeURIComponent(item.moderation_status)}` : `/${item.module}s?view=reviews&item_id=${encodeURIComponent(item.item_id)}&review_id=${encodeURIComponent(item.review_id)}&status=${encodeURIComponent(item.moderation_status)}`;
  return <article id={`platform-review-${item.review_id}`} className={`rounded-xl border p-4 transition-all duration-300 ${isFocused ? "border-[#1f6a58] bg-[#f0f9f5] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#1f6a58]">🏢 {item.business_name}</p><p className="mt-1 text-sm"><Link href={itemHref} className="font-semibold text-[#1f6a58] underline">{item.item_name}</Link></p><p className="mt-1 font-semibold text-[#06201c]">{item.reviewer_name}{item.is_verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] text-[#1f6a58]">{t("reviews.verified")}</span> : null}{isFocused ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p>{item.reviewer_email ? <p className="text-xs text-[#52736a]">{item.reviewer_email}</p> : null}<time className="mt-1 block text-xs text-[#7f9d94]">{dateText}</time>{latestAudit ? <p className="mt-2 text-xs font-semibold text-[#52736a]">Latest action: {latestAudit.to_status.replace(/[_-]+/g, " ")} by {auditActorLabel(latestAudit)}</p> : null}</div><div className="flex items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{item.rating ? `${item.rating} ★` : t("reviews.ratingUnavailable")}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[item.moderation_status]}`}>{t(`reviews.status.${item.moderation_status}`)}</span></div></div>
    {item.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{isLong && !expanded ? `${item.comment.slice(0, 240)}…` : item.comment}{isLong ? <button type="button" onClick={onToggle} className="ml-2 font-semibold text-[#1f6a58] underline">{expanded ? t("reviews.showLess") : t("reviews.readMore")}</button> : null}</p> : null}
    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-3">{nextStatuses(item.moderation_status).map((next) => <button key={next} type="button" disabled={busy} onClick={() => onAction(next)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] disabled:opacity-50">{t(`reviews.actions.${next}`)}</button>)}<button type="button" disabled={busy} onClick={onDelete} className="rounded-full border border-[#e1c9c6] px-3 py-1.5 text-xs font-bold text-[#a52a20] disabled:opacity-50">{t("reviews.actions.delete")}</button></div>
    </article>;
}
