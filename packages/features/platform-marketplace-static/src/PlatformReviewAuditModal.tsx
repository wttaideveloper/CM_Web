"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlatformReviewsAudit, normalizeUtcDate } from "./platform-reviews.service";
import type { ReviewModule } from "./platform-reviews.types";

/** Accessible audit dialog for platform-wide review moderation. */
export function PlatformReviewAuditModal({ module, onClose }: { module: ReviewModule; onClose: () => void }) {
  const { t } = useTranslation("platform");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const query = useQuery({ queryKey: ["platform", "review-audit", module], queryFn: () => getPlatformReviewsAudit(module), staleTime: 15_000, retry: 1 });
  const moduleName = t(`reviews.modules.${module}`);
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="platform-review-audit-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
      <header className="flex items-start justify-between gap-4"><div><h2 id="platform-review-audit-title" className="text-lg font-bold text-[#06201c]">{t("reviews.audit.title")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("reviews.audit.description")}</p></div><button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">{t("reviews.close")}</button></header>
      {query.isLoading ? <p className="mt-5 text-sm text-[#52736a]">{t("reviews.audit.loading")}</p> : null}
      {query.isError ? <div role="alert" className="mt-5 text-sm text-[#b42318]">{(query.error as Error).message} <button type="button" onClick={() => void query.refetch()} className="font-bold underline">{t("reviews.retry")}</button></div> : null}
      {!query.isLoading && !query.isError && !query.data?.length ? <p className="mt-5 text-sm text-[#52736a]">{t("reviews.audit.empty", { module: moduleName })}</p> : null}
      {query.data?.length ? <ol className="mt-5 grid gap-3">{query.data.map((entry) => { const stamp = normalizeUtcDate(entry.created_at); const date = stamp ? new Date(stamp) : null; const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : t("reviews.dateUnavailable"); return <li key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold capitalize text-[#06201c]">{entry.from_status ? `${entry.from_status} → ` : ""}{entry.to_status.replace(/[_-]+/g, " ")}</p><time className="text-xs text-[#7f9d94]">{dateText}</time></div><p className="mt-1 text-sm text-[#52736a]">{entry.item_name ?? moduleName} · {t("reviews.audit.reviewId", { id: entry.review_id })}</p><p className="mt-1 text-xs text-[#7f9d94]">{entry.actor_role ?? t("reviews.audit.staff")}{entry.actor_user_id ? ` · ${entry.actor_user_id}` : ""}</p></li>; })}</ol> : null}
    </section>
  </div>;
}
