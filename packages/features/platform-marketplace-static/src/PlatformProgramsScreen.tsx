"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listPrograms } from "@ihp/enterprise-trainings";
import type { ProgramListItem } from "@ihp/enterprise-trainings";

const filters = ["All", "draft", "published", "archived"] as const;
const PAGE_SIZE = 20;

function pillClass(status: string) {
  const s = status.toLowerCase();
  if (s === "published") return "bg-[#e8f6ee] text-[#16825b]";
  if (s === "draft") return "bg-[#fff7e5] text-[#b7791f]";
  if (s === "archived") return "bg-[#f1f4f3] text-[#6b7f79]";
  return "bg-[#eef4ff] text-[#2563eb]";
}

function ProgramCard({ program }: { program: ProgramListItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-[140px] bg-gradient-to-br from-[#1f6a58] via-[#5a9b78] to-[#c3d8a6] p-5">
        <span className="relative rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#1f6a58]">{program.category || "—"}</span>
        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${pillClass(program.status)}`}>{program.status}</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold leading-tight text-[#06201c]">{program.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-[#52736a]">{program.description || "—"}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-[#52736a]">{program.delivery_mode || "—"} · {Array.isArray(program.phases) ? `${program.phases.length} phases` : "—"}</span>
          <span className="font-semibold text-[#06201c]">{program.price ?? "—"}</span>
        </div>
      </div>
    </article>
  );
}

/**
 * Platform program management — lists programs from the classified marketplace API.
 */
export default function PlatformProgramsScreen() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={client}>
      <PlatformProgramsContent />
    </QueryClientProvider>
  );
}

function PlatformProgramsContent() {
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

  const q = useQuery({
    queryKey: ["programs", "platform-list", debounced, filter, page],
    queryFn: () => listPrograms({ search: debounced || undefined, status: filter === "All" ? undefined : filter, page, page_size: PAGE_SIZE }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const pagination = q.data?.pagination;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Program Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">Create and manage programs.</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs..."
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
          <p className="font-bold text-[#06201c]">Loading programs...</p>
        </div>
      ) : q.isError ? (
        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="font-bold text-[#06201c]">Unable to load programs.</p>
          <p className="mt-2 text-sm text-[#52736a]">{(q.error as Error).message}</p>
          <button type="button" onClick={() => void q.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">
            Try again
          </button>
        </div>
      ) : !pagination || (q.data?.items?.length ?? 0) === 0 ? (
        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="font-bold text-[#06201c]">No programs found.</p>
          <p className="mt-2 text-sm text-[#52736a]">Try a different search or filter.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy={q.isFetching}>
            {(q.data?.items ?? []).map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
          <nav aria-label="Programs pagination" className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
    </>
  );
}