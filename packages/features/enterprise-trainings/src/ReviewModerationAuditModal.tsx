"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { getTrainingReviewsAudit } from "./trainings.service";
import { normalizeUtcDate } from "./training-reviews.service";

function formatLocalTimestamp(value: string | null): string {
  const normalized = normalizeUtcDate(value);
  if (!normalized) return "Date unavailable";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function auditActorLabel(entry: { actor_role: string | null; actor_name?: string | null; actor_user_id: string | null }): string {
  const role = entry.actor_role?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const roleLabel = role.includes("super_admin") || role.includes("platform_admin") ? "Super Admin" : entry.actor_role ?? "Staff";
  const name = entry.actor_name && !entry.actor_name.includes("@") ? entry.actor_name : null;
  return [roleLabel, name ?? (!entry.actor_name ? entry.actor_user_id : null)].filter(Boolean).join(" · ");
}

/** Displays Training review moderation audit records in an accessible modal. */
export function ReviewModerationAuditModal({ trainingId, reviewId, onClose }: { trainingId?: string; reviewId?: string; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const auditQuery = useQuery({
    queryKey: ["training-reviews", "audit", trainingId ?? "all"],
    queryFn: () => getTrainingReviewsAudit(trainingId),
    staleTime: 15_000,
    retry: 1,
  });
  const entries = auditQuery.data?.filter((entry) => !reviewId || entry.review_id === reviewId) ?? [];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="training-review-audit-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="training-review-audit-title" className="text-lg font-bold text-[#06201c]">Moderation history</h2><p className="mt-1 text-sm text-[#52736a]">Review moderation actions and timestamps.</p></div>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1f6a58]">Close</button>
        </div>
        {auditQuery.isLoading ? <p className="mt-5 text-sm text-[#52736a]">Loading moderation history…</p> : null}
        {auditQuery.isError ? <div role="alert" className="mt-5 rounded-lg bg-[#fff5f4] p-3 text-sm text-[#b42318]">{(auditQuery.error as Error).message}<button type="button" onClick={() => void auditQuery.refetch()} className="ml-2 font-bold underline">Retry</button></div> : null}
        {!auditQuery.isLoading && !auditQuery.isError && entries.length === 0 ? <p className="mt-5 text-sm text-[#52736a]">No moderation history yet.</p> : null}
        {entries.length > 0 ? <ol className="mt-5 grid gap-3">{entries.map((entry) => <li key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold capitalize text-[#06201c]">{entry.from_status ? `${entry.from_status} → ` : ""}{entry.to_status.replace(/[_-]+/g, " ")}</p><time className="text-xs text-[#7f9d94]">{formatLocalTimestamp(entry.created_at)}</time></div><p className="mt-1 text-sm text-[#52736a]">{entry.item_name ?? (trainingId ? "This Training" : "Training")} · Review {entry.review_id.slice(0, 8)}</p><p className="mt-1 text-xs text-[#7f9d94]">{auditActorLabel(entry)}</p></li>)}</ol> : null}
      </section>
    </div>
  );
}
