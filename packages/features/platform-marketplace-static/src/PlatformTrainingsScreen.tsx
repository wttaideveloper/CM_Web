"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { listTrainings } from "@ihp/enterprise-trainings";
import type { TrainingListItem } from "@ihp/enterprise-trainings";
import { listPlatformReviewsManage } from "./platform-reviews.service";
import { PlatformModuleReviewsTab } from "./PlatformModuleReviewsTab";
import PlatformTrainingDetailsModal from "./PlatformTrainingDetailsModal";

const filters = ["All", "draft", "published", "archived"] as const;
const PAGE_SIZE = 20;

function pillClass(status: string) {
  const s = status.toLowerCase();
  if (s === "published") return "bg-[#e8f6ee] text-[#16825b]";
  if (s === "draft") return "bg-[#fff7e5] text-[#b7791f]";
  if (s === "archived") return "bg-[#f1f4f3] text-[#6b7f79]";
  return "bg-[#eef4ff] text-[#2563eb]";
}

function TrainingCard({ training, onOpen }: { training: TrainingListItem; onOpen: (trigger: HTMLElement) => void }) {
  const primaryImage = typeof training.primary_image === "string" ? training.primary_image.trim() : "";
  const hasImage = primaryImage.length > 0;

  return (
    <article role="button" tabIndex={0} aria-label={`View details for ${training.title}`} onClick={(event) => onOpen(event.currentTarget)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(event.currentTarget); } }} className="group overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm outline-none transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">
      <div className={`relative h-[140px] p-5 ${hasImage ? "bg-cover bg-center" : "bg-gradient-to-br from-[#1f6a58] via-[#5a9b78] to-[#c3d8a6]"}`} style={hasImage ? { backgroundImage: `url(${JSON.stringify(primaryImage)})` } : undefined}>
        {hasImage ? <div className="absolute inset-0 bg-gradient-to-br from-[#06201c]/55 via-[#0c382e]/40 to-[#1f6a58]/28" /> : null}
        <span className={`relative rounded-full px-3 py-1 text-xs font-bold ${hasImage ? "bg-white/90 text-[#06201c]" : "bg-white/90 text-[#1f6a58]"}`}>{training.category || "—"}</span>
        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${pillClass(training.status)}`}>{training.status}</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold leading-tight text-[#06201c]">{training.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-[#52736a]">{training.description || "—"}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-[#52736a]">{training.delivery_mode || "—"}</span>
          <span className="font-semibold text-[#06201c]">{training.price ? `${training.price} ${training.currency ?? ""}`.trim() : "—"}</span>
        </div>
      </div>
    </article>
  );
}

/**
 * Platform training management — lists trainings from the classified marketplace API.
 */
export default function PlatformTrainingsScreen() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={<div role="status" className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[290px] animate-pulse rounded-xl bg-[#edf3f0]" />)}</div>}>
        <PlatformTrainingsContent />
      </Suspense>
    </QueryClientProvider>
  );
}

function PlatformTrainingsContent() {
  const { t } = useTranslation("platform");
  const searchParams = useSearchParams();
  const [view, setView] = useState<"trainings" | "reviews">("trainings");
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [showReviewAudit, setShowReviewAudit] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<"pending" | "approved" | "rejected" | "all">("all");
  const [showSelectedReviewAudit, setShowSelectedReviewAudit] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openTraining = (trainingId: string, trigger?: HTMLElement) => {
    if (trigger) triggerRef.current = trigger;
    setSelectedReviewId(null);
    setSelectedReviewStatus("all");
    setShowSelectedReviewAudit(false);
    setSelectedTrainingId(trainingId);
  };
  const closeTraining = () => {
    setSelectedTrainingId(null);
    setSelectedReviewId(null);
    setShowSelectedReviewAudit(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const reviewItem = searchParams.get("reviewItem");
    if (reviewItem) {
      setView("trainings");
      setSelectedTrainingId(reviewItem);
      setSelectedReviewId(searchParams.get("review_id"));
      const requestedStatus = searchParams.get("status");
      setSelectedReviewStatus(requestedStatus === "pending" || requestedStatus === "approved" || requestedStatus === "rejected" ? requestedStatus : "all");
      setShowSelectedReviewAudit(searchParams.get("show_audit") === "true");
    }
    if (searchParams.get("view") === "reviews") {
      setView("reviews");
      setReviewItemId(searchParams.get("item_id"));
      setReviewId(searchParams.get("review_id"));
      const requestedStatus = searchParams.get("status");
      if (requestedStatus === "pending" || requestedStatus === "approved" || requestedStatus === "rejected" || requestedStatus === "all") {
        setReviewStatus(requestedStatus);
      }
      setShowReviewAudit(searchParams.get("show_audit") === "true");
    } else if (searchParams.get("view") === "trainings") {
      setView("trainings");
    }
  }, [searchParams]);

  const q = useQuery({
    queryKey: ["trainings", "platform-list", debounced, filter, page],
    queryFn: () => listTrainings({ search: debounced || undefined, status: filter === "All" ? undefined : filter, page, page_size: PAGE_SIZE }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const pagination = q.data?.pagination;
  const pendingReviewsQuery = useQuery({ queryKey: ["platform", "reviews", "training", "pending-count"], queryFn: () => listPlatformReviewsManage({ module: "training", status: "pending", page: 1, pageSize: 1 }), staleTime: 30_000, retry: 1 });

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Training Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">Create and manage training courses.</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-b border-[#e1ebe6]" role="tablist" aria-label={t("reviews.filterStatus")}>
        <button type="button" role="tab" aria-selected={view === "trainings"} onClick={() => setView("trainings")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${view === "trainings" ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>{t("reviews.tabs.trainings")}</button>
        <button type="button" role="tab" aria-selected={view === "reviews"} onClick={() => setView("reviews")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${view === "reviews" ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>{t("reviews.tabs.received", { count: pendingReviewsQuery.data?.counts.pending ?? 0 })}</button>
      </div>
      {view === "reviews" ? <PlatformModuleReviewsTab module="training" itemId={reviewItemId} reviewId={reviewId} initialStatus={reviewStatus} openAuditOnLoad={showReviewAudit} /> : <>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses..."
            className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = f === filter;
              return (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`h-10 rounded-full border px-4 text-sm font-semibold ${active ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] bg-white text-[#52736a]"}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="font-bold text-[#06201c]">Loading trainings...</p>
        </div>
      ) : q.isError ? (
        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="font-bold text-[#06201c]">Unable to load trainings.</p>
          <p className="mt-2 text-sm text-[#52736a]">{(q.error as Error).message}</p>
          <button type="button" onClick={() => void q.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">
            Try again
          </button>
        </div>
      ) : !pagination || (q.data?.items?.length ?? 0) === 0 ? (
        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="font-bold text-[#06201c]">No trainings found.</p>
          <p className="mt-2 text-sm text-[#52736a]">Try a different search or filter.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy={q.isFetching}>
            {(q.data?.items ?? []).map((t) => (
              <TrainingCard key={t.id} training={t} onOpen={(trigger) => openTraining(t.id, trigger)} />
            ))}
          </div>
          <nav aria-label="Trainings pagination" className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#52736a]">
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} total
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={pagination.page <= 1 || q.isPlaceholderData} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-50">
                Previous
              </button>
              <button type="button" onClick={() => setPage((c) => c + 1)} disabled={pagination.page >= pagination.total_pages || q.isPlaceholderData} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-50">
                Next
              </button>
            </div>
          </nav>
        </>
      )}
      {selectedTrainingId ? <PlatformTrainingDetailsModal trainingId={selectedTrainingId} reviewId={selectedReviewId} reviewStatus={selectedReviewStatus} openReviewAudit={showSelectedReviewAudit} onClose={closeTraining} /> : null}
      </>}
    </>
  );
}
