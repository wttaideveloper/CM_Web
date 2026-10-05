"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import TrainingActionsMenu from "./TrainingActionsMenu";
import { humanizeLabel } from "./detail-formatters";
import { PRODUCT_TRAINING_STATUSES, getTrainingStatusBadgeClass, getTrainingStatusLabel } from "./training-status";
import { getTrainingProviderDashboard, listTrainings, searchTrainings, getTrainingsReportSummary, type TrainingListItem } from "./trainings.service";
import { getTrainingMediaPreviewUrl } from "./training-media-url";

type SortOption = "newest" | "oldest" | "az" | "status";
const statusFilters = ["all", ...PRODUCT_TRAINING_STATUSES] as const;
type StatusFilter = (typeof statusFilters)[number];
const TRAININGS_PAGE_SIZE = 20;

function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value));
}
function sortTrainings(items: TrainingListItem[], sort: SortOption) {
  return [...items].sort((left, right) => {
    if (sort === "az") {
      return left.title.localeCompare(right.title);
    }

    if (sort === "status") {
      return left.status.localeCompare(right.status) || left.title.localeCompare(right.title);
    }

    const leftValid = isValidDate(left.created_at ?? "");
    const rightValid = isValidDate(right.created_at ?? "");

    if (leftValid && rightValid) {
      return sort === "oldest"
        ? Date.parse(left.created_at as string) - Date.parse(right.created_at as string)
        : Date.parse(right.created_at as string) - Date.parse(left.created_at as string);
    }

    if (leftValid) {
      return -1;
    }

    if (rightValid) {
      return 1;
    }

    return 0;
  });
}

function formatTrainingDate(value: string, separateTime?: string | null): string {
  if (!isValidDate(value)) {
    return "—";
  }
  const hasEmbeddedTime = /T\d{2}:\d{2}/.test(value);
  const formattedDate = new Intl.DateTimeFormat(undefined, hasEmbeddedTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(new Date(value));
  if (hasEmbeddedTime || !separateTime || !/^([01]\d|2[0-3]):[0-5]\d/.test(separateTime)) return formattedDate;
  const timeValue = new Date(`1970-01-01T${separateTime.slice(0, 5)}:00`);
  return `${formattedDate}, ${new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(timeValue)}`;
}

function formatTrainingAvailability(training: TrainingListItem, registrationCount: number | undefined): string {
  if (typeof training.available_slots === "number" && Number.isFinite(training.available_slots)) {
    return `${Math.max(0, training.available_slots)} seats available`;
  }
  if (typeof training.capacity === "string" && training.capacity.trim().length > 0) {
    const capacity = Number.parseInt(training.capacity.trim(), 10);
    if (Number.isFinite(capacity) && capacity > 0) {
      const availableSeats = typeof registrationCount === "number" && Number.isFinite(registrationCount)
        ? Math.max(0, capacity - registrationCount)
        : capacity;
      return `${availableSeats} seats available`;
    }
  }
  return "—";
}

function formatTrainingLocation(training: TrainingListItem): string {
  const mode = training.delivery_mode?.trim().toLowerCase();
  const venue = [training.venue, training.address].filter((value): value is string => Boolean(value?.trim())).join(", ");
  if (mode === "online" || mode === "self_paced") return mode === "self_paced" ? "Self-paced" : "Online";
  if (mode === "hybrid") return venue ? `Hybrid · ${venue}` : "Hybrid";
  return venue || (training.delivery_mode ? humanizeLabel(training.delivery_mode) : "—");
}

function TrainingsSummaryCard({ summary, isLoading, isError }: { summary: unknown; isLoading: boolean; isError: boolean }) {
  if (isLoading) return <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><p className="text-sm text-[#52736a]">Loading report summary...</p></section>;
  if (isError || !summary || typeof summary !== "object") return null;
  const record = summary as Record<string, unknown>;
  const total = record.total_trainings === null || record.total_trainings === undefined ? "" : String(record.total_trainings);
  const byStatus = record.by_status && typeof record.by_status === "object" ? (record.by_status as Record<string, unknown>) : undefined;
  const statusEntries = byStatus ? Object.entries(byStatus).sort((a, b) => Number(b[1]) - Number(a[1])) : [];
  const byCategory = record.by_category && typeof record.by_category === "object" ? (record.by_category as Record<string, unknown>) : undefined;
  const categoryEntries = byCategory ? Object.entries(byCategory).sort((a, b) => Number(b[1]) - Number(a[1])) : [];
  const toneClass = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (["enrolled", "attended", "active", "completed", "approved", "published"].includes(normalized)) return "rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]";
    if (["pending", "pending_approval", "draft", "waitlist", "waitlisted"].includes(normalized)) return "rounded-full bg-[#fff8e1] px-2 py-0.5 text-[10px] font-bold text-[#8a5a00]";
    if (["cancelled", "rejected", "no_show", "expired"].includes(normalized)) return "rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-bold text-[#b42318]";
    return "rounded-full bg-[#f0f3f2] px-2 py-0.5 text-[10px] font-bold text-[#52736a]";
  };
  return (
    <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Report Summary</p>
        {total !== "" ? <span className="rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]">{total} total trainings</span> : null}
      </div>
      {statusEntries.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {statusEntries.map(([status, count]) => (
            <span key={status} className={toneClass(status)}>{status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}: {String(count)}</span>
          ))}
        </div>
      ) : null}
      {categoryEntries.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categoryEntries.map(([category, count]) => (
            <span key={category} className="rounded-full bg-[#f0f3f2] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">{category}: {String(count)}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TrainingCard({ training, onStatusSuccess, onDuplicateSuccess, onDeleteSuccess }: { training: TrainingListItem; onStatusSuccess: () => void; onDuplicateSuccess: () => void; onDeleteSuccess: () => void }) {
  const { t } = useTranslation("enterpriseTrainings");
  const cardRef = useRef<HTMLElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const needsEnrolmentCount = training.enrolled_count === null || training.enrolled_count === undefined;
  useEffect(() => {
    if (!needsEnrolmentCount || isNearViewport) return;
    const card = cardRef.current;
    if (!card || typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIsNearViewport(true);
      observer.disconnect();
    }, { rootMargin: "200px" });
    observer.observe(card);
    return () => observer.disconnect();
  }, [isNearViewport, needsEnrolmentCount]);

  const providerDashboardQuery = useQuery({
    queryKey: ["trainings", training.id, "dashboard", "provider"],
    queryFn: () => getTrainingProviderDashboard(training.id),
    enabled: needsEnrolmentCount && isNearViewport,
    staleTime: 30_000,
    retry: 1,
  });
  const registrationCount = typeof training.enrolled_count === "number" && Number.isFinite(training.enrolled_count)
    ? training.enrolled_count
    : providerDashboardQuery.data?.total_enrolments;
  const primaryImage = getTrainingMediaPreviewUrl(training.primary_image);
  const tags = [...new Set((training.tags ?? [])
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean))];
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasPrimaryImage = Boolean(primaryImage) && failedImageUrl !== primaryImage;
  useEffect(() => {
    if (!primaryImage) {
      setFailedImageUrl(null);
      return;
    }
    const image = new Image();
    image.onerror = () => setFailedImageUrl(primaryImage);
    image.src = primaryImage;
    return () => {
      image.onerror = null;
    };
  }, [primaryImage]);
  const labelClass = hasPrimaryImage ? "text-white/75" : "text-[#7f9d94]";
  const primaryTextClass = hasPrimaryImage ? "text-white" : "text-[#06201c]";
  const secondaryTextClass = hasPrimaryImage ? "text-white/85" : "text-[#52736a]";
  const dividerClass = hasPrimaryImage ? "border-white/25" : "border-[#edf3f0]";
  const bodyBackgroundClass = hasPrimaryImage ? "bg-[#06201c]/95" : "bg-white";

  return (
    <article ref={cardRef} className={`group relative flex h-full flex-col rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 ${hasPrimaryImage ? "hover:-translate-y-0.5 hover:border-[#4f9f76] hover:shadow-lg" : "hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md"}`}>
      {hasPrimaryImage ? (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[inherit] bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(primaryImage)})` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#06201c]/60 via-[#0c382e]/45 to-[#1f6a58]/35" />
        </div>
      ) : null}
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.12em] ${labelClass}`}>{training.category || "—"}</p>
            <h3 className={`mt-2 text-lg font-bold ${primaryTextClass}`}>{training.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${getTrainingStatusBadgeClass(training.status)}`}>{getTrainingStatusLabel(training.status)}</span>
            <div className={hasPrimaryImage ? "rounded-full bg-white/90 shadow-sm" : undefined}>
              <TrainingActionsMenu training={training} onStatusSuccess={onStatusSuccess} onDuplicateSuccess={onDuplicateSuccess} onDeleteSuccess={onDeleteSuccess} />
            </div>
          </div>
        </div>

        <p className={`mt-2 line-clamp-2 min-h-10 text-sm leading-5 ${secondaryTextClass}`}>{training.description || "—"}</p>
        {tags.length > 0 ? (
          <div className="mt-3">
            <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${labelClass}`}>{t("list.tags")}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag) => (
                <span key={tag} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${hasPrimaryImage ? "bg-white/90 text-[#1f6a58]" : "bg-[#e8f6ee] text-[#1f6a58]"}`}>{tag}</span>
              ))}
              {tags.length > 4 ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${hasPrimaryImage ? "bg-white/90 text-[#52736a]" : "bg-[#f0f3f2] text-[#52736a]"}`}>{t("list.moreTags", { count: tags.length - 4 })}</span> : null}
            </div>
          </div>
        ) : null}
        {training.status === "needs_revision" || training.status === "rejected" ? (
          <Link href={`/admin/trainings/${training.id}`} className={`mt-2 inline-block text-xs font-semibold underline underline-offset-2 ${hasPrimaryImage ? "text-white" : "text-[#8a5a00]"}`}>
            Review Super Admin feedback
          </Link>
        ) : null}

        <div className={`mt-auto grid grid-cols-1 gap-x-6 gap-y-4 border-t pt-3 text-sm sm:grid-cols-2 xl:grid-cols-4 ${dividerClass}`}>
          <div className="min-w-0">
            <p className={`break-words text-xs font-bold uppercase leading-4 tracking-[0.12em] ${labelClass}`}>Date</p>
            <p className={`mt-1 min-h-10 break-words font-bold leading-5 ${primaryTextClass}`}>{formatTrainingDate(training.start_date ?? "", training.start_time)}</p>
          </div>
          <div className="min-w-0">
            <p className={`break-words text-xs font-bold uppercase leading-4 tracking-[0.12em] ${labelClass}`}>Location / Delivery</p>
            <p className={`mt-1 min-h-10 break-words font-bold leading-5 ${primaryTextClass}`}>{formatTrainingLocation(training)}</p>
          </div>
          <div className="min-w-0">
            <p className={`break-words text-xs font-bold uppercase leading-4 tracking-[0.12em] ${labelClass}`}>Registrations</p>
            <p className={`mt-1 min-h-10 break-words font-bold leading-5 ${primaryTextClass}`}>{typeof registrationCount === "number" ? registrationCount : "—"}</p>
          </div>
          <div className="min-w-0">
            <p className={`break-words text-xs font-bold uppercase leading-4 tracking-[0.12em] ${labelClass}`}>Availability</p>
            <p className={`mt-1 min-h-10 break-words font-bold leading-5 ${primaryTextClass}`}>{formatTrainingAvailability(training, registrationCount)}</p>
          </div>
        </div>

        <Link
          href={`/admin/trainings/${training.id}`}
          className={`mt-auto flex min-h-11 items-center border-t pt-3 text-sm font-semibold outline-none transition-colors hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 ${hasPrimaryImage ? "border-white/25 text-white hover:text-white focus-visible:ring-white focus-visible:ring-offset-[#1f6a58]" : "border-[#edf3f0] text-[#1f6a58] hover:text-[#195646] focus-visible:ring-[#1f6a58]"}`}
        >
          View training details
        </Link>
      </div>
    </article>
  );
}

/** Renders the authenticated enterprise's paginated Trainings list. */
export default function EnterpriseTrainingsScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!statusFeedback) return;
    const timeoutId = window.setTimeout(() => setStatusFeedback(null), 5_000);
    return () => window.clearTimeout(timeoutId);
  }, [statusFeedback]);

  const trainingsQuery = useQuery({
    queryKey: ["trainings", "list", tenantId, enterpriseId, debouncedQuery, statusFilter, levelFilter, languageFilter, page, TRAININGS_PAGE_SIZE],
    queryFn: () =>
      debouncedQuery && statusFilter === "all"
        ? searchTrainings({
            query: debouncedQuery,
            tenant_id: tenantId ?? undefined,
            enterprise_id: enterpriseId ?? undefined,
            level: levelFilter === "all" ? undefined : levelFilter,
            language: languageFilter === "all" ? undefined : languageFilter,
            page,
            page_size: TRAININGS_PAGE_SIZE,
          })
        : listTrainings({
            search: debouncedQuery || undefined,
            tenant_id: tenantId ?? undefined,
            enterprise_id: enterpriseId ?? undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            level: levelFilter === "all" ? undefined : levelFilter,
            language: languageFilter === "all" ? undefined : languageFilter,
            page,
            page_size: TRAININGS_PAGE_SIZE,
          }),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const visibleTrainings = useMemo(() => {
    return sortTrainings(trainingsQuery.data?.items ?? [], sort);
  }, [trainingsQuery.data?.items, sort]);
  const pagination = trainingsQuery.data?.pagination;
  const hasActiveFilters = Boolean(debouncedQuery) || statusFilter !== "all" || levelFilter !== "all" || languageFilter !== "all";

  const showStatusFeedback = () => setStatusFeedback("Training status updated.");
  const showDuplicateFeedback = () => setStatusFeedback("Training duplicated.");
  const showDeleteFeedback = () => setStatusFeedback("Training deleted.");

  const summaryQuery = useQuery({ queryKey: ["trainings", "reports", "summary"], queryFn: () => getTrainingsReportSummary(), enabled: Boolean(tenantId), staleTime: 30_000, retry: 1 });

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
            ADMIN PORTAL
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">Trainings</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a] sm:text-base">
            Manage training courses for your enterprise.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {enterpriseId ? (
            <Link
              href="/admin/trainings/create"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#195646]"
            >
              + Create Training
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="Enterprise required"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white opacity-60"
            >
              + Create Training
            </button>
          )}
        </div>
      </div>

      {statusFeedback ? <p role="status" className="mt-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{statusFeedback}</p> : null}

      <TrainingsSummaryCard summary={summaryQuery.data} isLoading={summaryQuery.isLoading} isError={summaryQuery.isError} />

      <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, description, or category"
              className="mt-2 h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
            />
          </label>
          <label className="block xl:w-[220px]">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">A-Z</option>
              <option value="status">Status</option>
            </select>
          </label>
          <label className="block xl:w-[160px]">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Level</span>
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }} className="mt-2 h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]">
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="block xl:w-[160px]">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Language</span>
            <select value={languageFilter} onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }} className="mt-2 h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]">
              <option value="all">All languages</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const active = statusFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setStatusFilter(filter);
                  setPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-[#e8f6ee] text-[#1f6a58]" : "border border-[#d7e5df] bg-white text-[#52736a] hover:bg-[#f4faf7]"}`}
              >
                {filter === "all" ? "All" : getTrainingStatusLabel(filter)}
              </button>
            );
          })}
        </div>
      </section>

      {trainingsQuery.isLoading ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2" aria-live="polite" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#e1ebe6] bg-white p-5">
              <div className="h-4 w-1/3 rounded bg-[#edf3f0]" />
              <div className="mt-3 h-6 w-3/4 rounded-lg bg-[#edf3f0]" />
              <div className="mt-3 h-10 rounded-lg bg-[#edf3f0]" />
              <div className="mt-4 h-12 rounded-xl bg-[#edf3f0]" />
            </div>
          ))}
          <span className="sr-only">Loading trainings…</span>
        </section>
      ) : trainingsQuery.isError ? (
        <section className="mt-6 rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] px-8 py-12 text-center shadow-sm" role="alert">
          <p className="text-2xl" aria-hidden="true">!</p>
          <p className="mt-3 text-base font-bold text-[#b42318]">We couldn’t load trainings</p>
          <p className="mt-2 text-sm leading-5 text-[#6b5a52]">{(trainingsQuery.error as Error).message || "Check your connection and try again."}</p>
          <button type="button" onClick={() => void trainingsQuery.refetch()} className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#195646]">Try again</button>
        </section>
      ) : !pagination || visibleTrainings.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-[#cfe0d8] bg-[#f9fcfa] px-8 py-16 text-center shadow-sm">
          <p className="mt-3 text-base font-bold text-[#06201c]">{hasActiveFilters ? "No trainings match these filters" : "No trainings yet"}</p>
          <p className="mt-2 mx-auto max-w-md text-sm leading-5 text-[#52736a]">
            {hasActiveFilters
              ? "Try changing your search or filters to find other trainings."
              : "Create your first training to start enrolling learners. Use a clear title and a great cover image — it makes all the difference."}
          </p>
          {!hasActiveFilters ? (
            enterpriseId ? (
              <a href="/admin/trainings/create" className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#195646]">+ Create Training</a>
            ) : (
              <button type="button" disabled title="Enterprise required" className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white opacity-60">+ Create Training</button>
            )
          ) : null}
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2" aria-busy={trainingsQuery.isFetching}>
            {visibleTrainings.map((training) => (
              <TrainingCard key={training.id} training={training} onStatusSuccess={showStatusFeedback} onDuplicateSuccess={showDuplicateFeedback} onDeleteSuccess={showDeleteFeedback} />
            ))}
          </section>
          <nav aria-label="Trainings pagination" className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm font-semibold text-[#52736a]">
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} total
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1 || trainingsQuery.isPlaceholderData}
                className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] transition hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={pagination.page >= pagination.total_pages || trainingsQuery.isPlaceholderData}
                className="h-10 rounded-full border border-[#1f6a58] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
