"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";

import ProgramActionsMenu from "./ProgramActionsMenu";
import { PRODUCT_PROGRAM_STATUSES, getProgramStatusBadgeClass, getProgramStatusLabel } from "./program-status";
import { listPrograms, type ProgramListItem } from "./programs.service";

type SortOption = "newest" | "oldest" | "az" | "status";
const statusFilters = ["all", ...PRODUCT_PROGRAM_STATUSES] as const;
type StatusFilter = (typeof statusFilters)[number];
const PROGRAMS_PAGE_SIZE = 20;

function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value));
}

function sortPrograms(items: ProgramListItem[], sort: SortOption) {
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

function formatProgramDate(value: string): string {
  if (!isValidDate(value)) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function ProgramCard({ program, onStatusSuccess, onDuplicateSuccess, onDeleteSuccess }: { program: ProgramListItem; onStatusSuccess: () => void; onDuplicateSuccess: () => void; onDeleteSuccess: () => void }) {
  return (
    <article className="group relative rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{program.category || "—"}</p>
          <h3 className="mt-2 text-lg font-bold text-[#06201c]">{program.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${getProgramStatusBadgeClass(program.status)}`}>{getProgramStatusLabel(program.status)}</span>
          <ProgramActionsMenu program={program} onStatusSuccess={onStatusSuccess} onDuplicateSuccess={onDuplicateSuccess} onDeleteSuccess={onDeleteSuccess} />
        </div>
      </div>

      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#52736a]">{program.description || "—"}</p>

      <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-[#edf3f0] pt-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Delivery</p>
          <p className="mt-1 font-semibold text-[#06201c]">{program.delivery_mode || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Phases</p>
          <p className="mt-1 font-semibold text-[#06201c]">{Array.isArray(program.phases) ? program.phases.length : "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Created</p>
          <p className="mt-1 font-semibold text-[#06201c]">{formatProgramDate(program.created_at ?? "")}</p>
        </div>
      </div>

      <Link href={`/admin/programs/${program.id}`} className="mt-3 block border-t border-[#edf3f0] pt-3 text-sm font-semibold text-[#1f6a58] outline-none transition-colors hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#1f6a58]">
        View program details
      </Link>
    </article>
  );
}

/** Renders the authenticated enterprise's paginated Programs list. */
export default function EnterpriseProgramsScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const programsQuery = useQuery({
    queryKey: ["programs", "list", tenantId, enterpriseId, debouncedQuery, statusFilter, page, PROGRAMS_PAGE_SIZE],
    queryFn: () =>
      listPrograms({
        tenant_id: tenantId ?? undefined,
        enterprise_id: enterpriseId ?? undefined,
        search: debouncedQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        page_size: PROGRAMS_PAGE_SIZE,
      }),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const visiblePrograms = useMemo(() => {
    return sortPrograms(programsQuery.data?.items ?? [], sort);
  }, [programsQuery.data?.items, sort]);
  const pagination = programsQuery.data?.pagination;

  const showStatusFeedback = () => setStatusFeedback("Program status updated.");
  const showDuplicateFeedback = () => setStatusFeedback("Program duplicated.");
  const showDeleteFeedback = () => setStatusFeedback("Program deleted.");

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
            ADMIN PORTAL
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">Programs</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a] sm:text-base">
            Manage programs for your enterprise.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {enterpriseId ? (
            <Link
              href="/admin/programs/create"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#195646]"
            >
              + Create Program
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="Enterprise required"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white opacity-60"
            >
              + Create Program
            </button>
          )}
        </div>
      </div>

      {statusFeedback ? <p role="status" className="mt-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{statusFeedback}</p> : null}

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
                {filter === "all" ? "All" : getProgramStatusLabel(filter)}
              </button>
            );
          })}
        </div>
      </section>

      {programsQuery.isLoading ? (
        <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading programs...</p>
        </section>
      ) : programsQuery.isError ? (
        <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load programs.</p>
          <p className="mt-2 text-sm text-[#52736a]">{(programsQuery.error as Error).message}</p>
          <button type="button" onClick={() => void programsQuery.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">
            Try again
          </button>
        </section>
      ) : !pagination || visiblePrograms.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">No programs found.</p>
          <p className="mt-2 text-sm text-[#52736a]">Try a different search or filter.</p>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2" aria-busy={programsQuery.isFetching}>
            {visiblePrograms.map((program) => (
              <ProgramCard key={program.id} program={program} onStatusSuccess={showStatusFeedback} onDuplicateSuccess={showDuplicateFeedback} onDeleteSuccess={showDeleteFeedback} />
            ))}
          </section>
          <nav aria-label="Programs pagination" className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm font-semibold text-[#52736a]">
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} total
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1 || programsQuery.isPlaceholderData}
                className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] transition hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={pagination.page >= pagination.total_pages || programsQuery.isPlaceholderData}
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