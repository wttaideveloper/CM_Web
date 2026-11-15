"use client";

import { useEffect, useState } from "react";
import { getExistingGroupsPreviewState, shouldCollapseExistingGroups, type ExistingGroupPreviewItem } from "./existing-groups-preview";

interface ExistingGroupsPreviewProps {
  contextKey: string;
  count: number | null;
  items: readonly ExistingGroupPreviewItem[];
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  page?: number;
  totalPages?: number;
  onPage?: (page: number) => void;
  note?: string;
}

/** Displays authorized associated Groups without making names navigable or editable. */
export default function ExistingGroupsPreview({ contextKey, count, items, isPending, isError, errorMessage, onRetry, page = 1, totalPages = 1, onPage, note }: ExistingGroupsPreviewProps) {
  const [expanded, setExpanded] = useState(() => !shouldCollapseExistingGroups(count));
  const state = getExistingGroupsPreviewState({ isPending, isError, count, itemCount: items.length });
  useEffect(() => { setExpanded(!shouldCollapseExistingGroups(count)); }, [contextKey, count]);
  const countLabel = count === null ? "—" : count;
  return <section className="rounded-xl border border-[#d7e5df] bg-white p-3" aria-label={`Existing Groups (${countLabel})`}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-[#16332b]">Existing Groups ({countLabel})</h2>
      {state === "ready" ? <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="rounded-full border border-[#d7e5df] px-2.5 py-1 text-xs font-semibold text-[#1f6a58] hover:border-[#1f6a58]">{expanded ? "Hide" : "Show"}</button> : null}
    </div>
    {state === "loading" ? <p className="mt-2 text-xs text-[#52736a]" role="status" aria-live="polite">Loading existing Groups...</p> : null}
    {state === "error" ? <div className="mt-2 text-xs text-[#7a271a]" role="alert"><p>{errorMessage || "Existing Groups could not be loaded."}</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-1 font-semibold underline">Try again</button> : null}</div> : null}
    {state === "empty" ? <p className="mt-2 text-xs text-[#52736a]">No Groups are associated with this selection.</p> : null}
    {state === "details-unavailable" ? <p className="mt-2 text-xs text-[#52736a]">Group details are unavailable for the reported count.</p> : null}
    {state === "ready" && expanded ? <>
      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
        {items.map((group) => <div key={group.id} className="rounded-lg bg-[#f9fcfa] p-2.5"><p className="truncate text-sm font-semibold text-[#16332b]">{group.name}</p><p className="mt-1 text-xs text-[#52736a]">{group.member_count === null ? "Member count unavailable" : `${group.member_count} member${group.member_count === 1 ? "" : "s"}`} · {group.status?.trim() || "Status unavailable"}</p></div>)}
      </div>
      {totalPages > 1 && onPage ? <div className="mt-2 flex items-center justify-between text-xs text-[#52736a]"><span>Page {page} of {totalPages}</span><span className="flex gap-2"><button type="button" disabled={page <= 1 || isPending} onClick={() => onPage(page - 1)} className="rounded-lg border border-[#d7e5df] px-2 py-1 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages || isPending} onClick={() => onPage(page + 1)} className="rounded-lg border border-[#d7e5df] px-2 py-1 font-semibold disabled:opacity-40">Next</button></span></div> : null}
    </> : null}
    {note ? <p className="mt-2 text-xs text-[#805900]">{note}</p> : null}
  </section>;
}
