"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { deletePlatformReview, getPlatformReviewsAudit, listPlatformReviewsManage, moderatePlatformReview, normalizeUtcDate } from "./platform-reviews.service";
import type { PlatformReviewAuditEntry, PlatformReviewQueueItem, ReviewModerationStatus, StarRating } from "./platform-reviews.types";
import { PlatformReviewAuditModal } from "./PlatformReviewAuditModal";

type StatusFilter = ReviewModerationStatus | "all";
const STATUSES: readonly StatusFilter[] = ["pending", "approved", "rejected", "all"];
const STATUS_CLASS: Record<ReviewModerationStatus, string> = { pending: "bg-[#fff4d6] text-[#805900]", approved: "bg-[#e8f6ee] text-[#1f6a58]", rejected: "bg-[#fff1ef] text-[#a52a20]" };
const nextStatuses = (status: ReviewModerationStatus): ReviewModerationStatus[] => status === "pending" ? ["approved", "rejected"] : status === "approved" ? ["rejected", "pending"] : ["approved", "pending"];

/** Renders a global review queue and moderation workflow for Event or Training. */
export function PlatformModuleReviewsTab({ module, itemId, reviewId, initialStatus = "pending", openAuditOnLoad = false }: { module: "event" | "training"; itemId?: string | null; reviewId?: string | null; initialStatus?: StatusFilter; openAuditOnLoad?: boolean }) {
  const { t } = useTranslation("platform");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [rating, setRating] = useState<StarRating | "all">("all");
  const [business, setBusiness] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [showAudit, setShowAudit] = useState(openAuditOnLoad);
  const [focusedReviewId, setFocusedReviewId] = useState<string | null>(reviewId ?? null);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  useEffect(() => {
    if (openAuditOnLoad !== undefined) {
      setShowAudit(openAuditOnLoad);
    }
  }, [openAuditOnLoad]);

  useEffect(() => {
    setFocusedReviewId(reviewId ?? null);
  }, [reviewId]);

  const moduleTitle = t(`reviews.modules.${module}`);
  const queue = useQuery({ queryKey: ["platform", "reviews", module, itemId, status, rating, search, page], queryFn: () => listPlatformReviewsManage({ module, itemId: itemId ?? undefined, status, rating, q: search.trim() || undefined, page, pageSize: 20 }), staleTime: 15_000, refetchOnMount: "always", retry: 1 });
  const rows = queue.data?.items ?? [];
  const auditItemIds = useMemo(() => [...new Set(rows.map((item) => item.item_id).filter(Boolean))], [rows]);
  const audit = useQuery({ queryKey: ["platform", "review-audit", module, "items", auditItemIds], queryFn: async () => (await Promise.all(auditItemIds.map((id) => getPlatformReviewsAudit(module, id)))).flat(), enabled: auditItemIds.length > 0, staleTime: 15_000, retry: 1 });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["platform", "reviews", module] }); void queryClient.invalidateQueries({ queryKey: ["platform", "review-audit", module] }); };
  const moderate = useMutation({ mutationFn: ({ id, action }: { id: string; action: ReviewModerationStatus }) => moderatePlatformReview(module, id, action), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (reviewId: string) => deletePlatformReview(module, reviewId), onSuccess: refresh });
  const latestAuditByReviewId = useMemo(() => {
    const latest = new Map<string, PlatformReviewAuditEntry>();
    for (const entry of audit.data ?? []) {
      if (!latest.has(entry.review_id)) latest.set(entry.review_id, entry);
    }
    return latest;
  }, [audit.data]);
  const businesses = useMemo(() => [...new Set(rows.map((item) => item.business_name).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rows]);
  const filtered = useMemo(() => rows.filter((item) => !focusedReviewId || item.review_id === focusedReviewId).filter((item) => business === "all" || item.business_name === business).filter((item) => { if (!search.trim()) return true; const term = search.trim().toLowerCase(); return [item.comment, item.item_name, item.reviewer_name].some((value) => value?.toLowerCase().includes(term)); }), [rows, focusedReviewId, business, search]);
  const counts = queue.data?.counts ?? { pending: 0, approved: 0, rejected: 0, all: 0 };
  const pagination = queue.data?.pagination;
  const action = (item: PlatformReviewQueueItem, next: ReviewModerationStatus) => { if (next === "rejected" && !window.confirm(t("reviews.confirmReject", { name: item.reviewer_name }))) return; moderate.mutate({ id: item.review_id, action: next }); };
  const removeItem = (item: PlatformReviewQueueItem) => { if (window.confirm(t("reviews.confirmDelete", { name: item.reviewer_name }))) remove.mutate(item.review_id); };

  useEffect(() => {
    if (!focusedReviewId || queue.isLoading) return;
    const target = document.getElementById(`platform-review-${focusedReviewId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusedReviewId, queue.isLoading, filtered]);

  return <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-[#06201c]">{t("reviews.receivedTitle", { module: moduleTitle })}</h3><p className="mt-1 text-sm text-[#52736a]">{t("reviews.receivedDescription", { module: moduleTitle.toLowerCase() })}</p></div><button type="button" onClick={() => setShowAudit(true)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">{t("reviews.audit.button")}</button></header>
    {moderate.isError || remove.isError ? <p role="alert" className="mt-3 rounded-lg border border-[#f3c7c3] bg-[#fff5f4] px-3 py-2 text-sm text-[#b42318]">{(moderate.error ?? remove.error as Error).message}</p> : null}
    {focusedReviewId ? (
      <div className="mt-3 flex items-center justify-between rounded-xl bg-[#e8f6ee] px-4 py-2.5 text-xs font-semibold text-[#1f6a58]">
        <span>Filtering to notified review</span>
        <button type="button" onClick={() => setFocusedReviewId(null)} className="font-bold underline hover:text-[#164e41]">Show all reviews</button>
      </div>
    ) : null}
    <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label={t("reviews.filterStatus")}>{STATUSES.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => { setStatus(item); setPage(1); }} className={`rounded-full border px-3 py-2 text-sm font-semibold ${status === item ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{t(`reviews.status.${item}`)}{item !== "all" ? ` (${counts[item]})` : ` (${counts.all})`}</button>)}
      {!itemId ? <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.business")}<select value={business} onChange={(event) => { setBusiness(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">{t("reviews.allBusinesses")}</option>{businesses.map((name) => <option key={name} value={name}>{name}</option>)}</select></label> : null}
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.rating")}<select value={rating} onChange={(event) => { setRating(event.target.value === "all" ? "all" : Number(event.target.value) as StarRating); setPage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c]"><option value="all">{t("reviews.allRatings")}</option>{([5, 4, 3, 2, 1] as const).map((value) => <option key={value} value={value}>{value} ★</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#52736a]">{t("reviews.search")}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("reviews.searchPlaceholder")} className="h-10 w-48 rounded-xl border border-[#d7e5df] px-3 text-sm text-[#06201c]" /></label>
    </div>
    {queue.isLoading ? <p aria-live="polite" className="mt-4 animate-pulse rounded-xl bg-[#f4faf7] p-5 text-sm">{t("reviews.loading")}</p> : null}
    {queue.isError ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{(queue.error as Error).message} <button type="button" onClick={() => void queue.refetch()} className="font-bold underline">{t("reviews.retry")}</button></p> : null}
    {!queue.isLoading && !queue.isError && !filtered.length ? <p className="mt-4 text-sm text-[#52736a]">{t("reviews.empty")}</p> : null}
    {filtered.length ? <div className="mt-4 grid gap-3">{filtered.map((item) => <ReviewRow key={item.review_id} item={item} latestAudit={latestAuditByReviewId.get(item.review_id) ?? null} expanded={expanded.has(item.review_id)} busy={moderate.isPending || remove.isPending} isFocused={Boolean(focusedReviewId && item.review_id === focusedReviewId)} onToggle={() => setExpanded((current) => { const next = new Set(current); next.has(item.review_id) ? next.delete(item.review_id) : next.add(item.review_id); return next; })} onAction={(next) => action(item, next)} onDelete={() => removeItem(item)} />)}</div> : null}
    {pagination && pagination.total_pages > 1 ? <nav aria-label={t("reviews.pagination.label")} className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#52736a]">{t("reviews.pagination.page", { page: pagination.page, pages: pagination.total_pages })}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || queue.isFetching} onClick={() => setPage((current) => current - 1)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm disabled:opacity-50">{t("reviews.pagination.previous")}</button><button type="button" disabled={page >= pagination.total_pages || queue.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{t("reviews.pagination.next")}</button></div></nav> : null}
    {showAudit ? <PlatformReviewAuditModal module={module} itemId={itemId ?? undefined} reviewId={focusedReviewId ?? undefined} onClose={() => setShowAudit(false)} /> : null}
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

function ReviewRow({ item, latestAudit, expanded, busy, onToggle, onAction, onDelete, isFocused }: { item: PlatformReviewQueueItem; latestAudit: PlatformReviewAuditEntry | null; expanded: boolean; busy: boolean; onToggle: () => void; onAction: (status: ReviewModerationStatus) => void; onDelete: () => void; isFocused?: boolean }) {
  const { t } = useTranslation("platform");
  const isLong = (item.comment?.length ?? 0) > 240;
  const dateValue = normalizeUtcDate(item.created_at);
  const date = dateValue ? new Date(dateValue) : null;
  const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : t("reviews.dateUnavailable");
  return <article id={`platform-review-${item.review_id}`} className={`rounded-xl border p-4 transition-all duration-300 ${isFocused ? "border-[#1f6a58] bg-[#f0f9f5] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#1f6a58]">🏢 {item.business_name}</p><p className="mt-1 text-sm"><Link href={item.module === "training" ? `/trainings?reviewItem=${encodeURIComponent(item.item_id)}&review_id=${encodeURIComponent(item.review_id)}&status=${encodeURIComponent(item.moderation_status)}` : `/events?reviewItem=${encodeURIComponent(item.item_id)}`} className="font-semibold text-[#1f6a58] underline">{item.item_name}</Link></p><p className="mt-1 font-semibold text-[#06201c]">{item.reviewer_name}{item.is_verified ? <span className="ml-2 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[11px] text-[#1f6a58]">{t("reviews.verified")}</span> : null}{isFocused ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[11px] font-bold text-white">Notified review</span> : null}</p>{item.reviewer_email ? <p className="text-xs text-[#52736a]">{item.reviewer_email}</p> : null}<time className="mt-1 block text-xs text-[#7f9d94]">{dateText}</time>{latestAudit ? <p className="mt-2 text-xs font-semibold text-[#52736a]">Latest action: {latestAudit.to_status.replace(/[_-]+/g, " ")} by {auditActorLabel(latestAudit)}</p> : null}</div><div className="flex items-center gap-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{item.rating ? `${item.rating} ★` : t("reviews.ratingUnavailable")}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[item.moderation_status]}`}>{t(`reviews.status.${item.moderation_status}`)}</span></div></div>
    {item.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#3c5d54]">{isLong && !expanded ? `${item.comment.slice(0, 240)}…` : item.comment}{isLong ? <button type="button" onClick={onToggle} className="ml-2 font-semibold text-[#1f6a58] underline">{expanded ? t("reviews.showLess") : t("reviews.readMore")}</button> : null}</p> : null}
    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-3">{nextStatuses(item.moderation_status).map((next) => <button key={next} type="button" disabled={busy} onClick={() => onAction(next)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] disabled:opacity-50">{t(`reviews.actions.${next}`)}</button>)}<button type="button" disabled={busy} onClick={onDelete} className="rounded-full border border-[#e1c9c6] px-3 py-1.5 text-xs font-bold text-[#a52a20] disabled:opacity-50">{t("reviews.actions.delete")}</button></div>
    </article>;
}
