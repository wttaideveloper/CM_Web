"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlatformReviewsAudit, normalizeUtcDate } from "./platform-reviews.service";
import type { PlatformReviewAuditEntry, ReviewModule } from "./platform-reviews.types";

function auditActorLabel(entry: PlatformReviewAuditEntry): string {
  const name = entry.actor_name && !entry.actor_name.includes("@") ? entry.actor_name : null;
  const normalizedRole = entry.actor_role?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const role = normalizedRole.includes("super_admin") || normalizedRole.includes("platform_admin") ? "Super Admin"
    : normalizedRole.includes("provider") ? "Provider"
      : normalizedRole.includes("enterprise_admin") || normalizedRole === "admin" ? "Enterprise Admin"
        : entry.actor_role || "Staff";
  return [role, name ?? (!entry.actor_name ? entry.actor_user_id : null)].filter(Boolean).join(" \u00b7 ");
}

/** Accessible audit dialog for platform-wide review moderation. */
export function PlatformReviewAuditModal({ module, itemId, reviewId, onClose }: { module: ReviewModule; itemId?: string; reviewId?: string; onClose: () => void }) {
  const { t } = useTranslation("platform");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const query = useQuery({ queryKey: ["platform", "review-audit", module, itemId], queryFn: () => getPlatformReviewsAudit(module, itemId), staleTime: 15_000, retry: 1 });
  const entries = query.data?.filter((entry) => !reviewId || entry.review_id === reviewId) ?? [];
  const moduleName = t(`reviews.modules.${module}`);
  const statusLabel = (status: string): string => {
    const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === "approved" || normalized === "pending" || normalized === "rejected") return t(`reviews.status.${normalized}`);
    return normalized.replace(/_/g, " ").replace(/^\w/, (character) => character.toUpperCase());
  };

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="platform-review-audit-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
      <header className="flex items-start justify-between gap-4"><div><h2 id="platform-review-audit-title" className="text-lg font-bold text-[#06201c]">{t("reviews.audit.title")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("reviews.audit.description")}</p></div><button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">{t("reviews.close")}</button></header>
      {query.isLoading ? <p className="mt-5 text-sm text-[#52736a]">{t("reviews.audit.loading")}</p> : null}
      {query.isError ? <div role="alert" className="mt-5 text-sm text-[#b42318]">{(query.error as Error).message} <button type="button" onClick={() => void query.refetch()} className="font-bold underline">{t("reviews.retry")}</button></div> : null}
      {!query.isLoading && !query.isError && !entries.length ? <p className="mt-5 text-sm text-[#52736a]">{t("reviews.audit.empty", { module: moduleName })}</p> : null}
      {entries.length ? <ol className="mt-5 grid gap-3">{entries.map((entry) => {
        const stamp = normalizeUtcDate(entry.created_at);
        const date = stamp ? new Date(stamp) : null;
        const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : t("reviews.dateUnavailable");
        return <li key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-[#06201c]">{entry.from_status ? `${statusLabel(entry.from_status)} \u2192 ` : ""}{statusLabel(entry.to_status)}</p><time className="text-xs text-[#7f9d94]">{dateText}</time></div><p className="mt-1 text-sm text-[#52736a]">{entry.item_name ?? moduleName} <span aria-hidden="true">{"\u00b7"}</span> {t("reviews.audit.reviewId", { id: entry.review_id })}</p><p className="mt-1 text-xs text-[#7f9d94]">{auditActorLabel(entry)}</p>{entry.reason ? <p className="mt-2 rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">Reason: {entry.reason}</p> : null}</li>;
      })}</ol> : null}
    </section>
  </div>;
}
