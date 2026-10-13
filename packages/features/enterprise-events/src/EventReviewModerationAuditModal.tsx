"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEventReviewsAudit } from "./events.service";
import { normalizeUtcDate } from "./event-reviews.service";

function localDate(value: string | null): string {
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

/** Accessible moderation history dialog for Event reviews. */
export function EventReviewModerationAuditModal({ eventId, reviewId, onClose }: { eventId?: string; reviewId?: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  const query = useQuery({ queryKey: ["event-reviews", "audit", eventId ?? "all"], queryFn: () => getEventReviewsAudit(eventId), staleTime: 15_000, retry: 1 });
  const entries = query.data?.filter((entry) => !reviewId || entry.review_id === reviewId) ?? [];
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="event-review-audit-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
      <header className="flex items-start justify-between gap-4"><div><h2 id="event-review-audit-title" className="text-lg font-bold text-[#06201c]">Moderation history</h2><p className="mt-1 text-sm text-[#52736a]">Event review moderation actions.</p></div><button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">Close</button></header>
      {query.isLoading ? <p className="mt-5 text-sm text-[#52736a]">Loading moderation history…</p> : null}
      {query.isError ? <div role="alert" className="mt-5 text-sm text-[#b42318]">{(query.error as Error).message} <button type="button" onClick={() => void query.refetch()} className="font-bold underline">Retry</button></div> : null}
      {!query.isLoading && !query.isError && !entries.length ? <p className="mt-5 text-sm text-[#52736a]">No moderation history yet.</p> : null}
      {entries.length ? <ol className="mt-5 grid gap-3">{entries.map((entry) => <li key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold capitalize text-[#06201c]">{entry.from_status ? `${entry.from_status} → ` : ""}{entry.to_status.replace(/[_-]+/g, " ")}</p><time className="text-xs text-[#7f9d94]">{localDate(entry.created_at)}</time></div><p className="mt-1 text-sm text-[#52736a]">{entry.item_name ?? "Event"} · Review {entry.review_id}</p><p className="mt-1 text-xs text-[#7f9d94]">{auditActorLabel(entry)}</p></li>)}</ol> : null}
    </section>
  </div>;
}
