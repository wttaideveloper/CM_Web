"use client";

import { useEffect, useMemo, useState } from "react";
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

function reviewerIdentity(entry: PlatformReviewAuditEntry): string {
  if (entry.customer_user_id) return `id:${entry.customer_user_id}`;
  if (entry.customer_email) return `email:${entry.customer_email.trim().toLocaleLowerCase()}`;
  return `name:${(entry.customer_name ?? "").trim().toLocaleLowerCase()}`;
}

/** Accessible audit dialog for platform-wide review moderation. */
export function PlatformReviewAuditModal({ module, itemId, reviewId, onClose }: { module: ReviewModule; itemId?: string; reviewId?: string; onClose: () => void }) {
  const { t } = useTranslation("platform");
  const [selectedItemId, setSelectedItemId] = useState(itemId ?? "");
  const [selectedReviewer, setSelectedReviewer] = useState("all");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setSelectedItemId(itemId ?? "");
    setSelectedReviewer("all");
  }, [module, itemId]);

  const query = useQuery({ queryKey: ["platform", "review-audit", module], queryFn: () => getPlatformReviewsAudit(module), staleTime: 15_000, retry: 1 });
  const auditEntries = query.data ?? [];

  // Notification links can open the audit dialog on a single review. Resolve its item
  // after the module-wide audit has loaded, while ordinary opens remain unfiltered.
  useEffect(() => {
    if (!itemId && reviewId && auditEntries.length) {
      const focusedEntry = auditEntries.find((entry) => entry.review_id === reviewId);
      if (focusedEntry) setSelectedItemId(focusedEntry.item_id);
    }
  }, [auditEntries, itemId, reviewId]);

  const moduleName = t(`reviews.modules.${module}`);
  const itemOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; business: string | null }>();
    for (const entry of auditEntries) {
      if (!byId.has(entry.item_id)) byId.set(entry.item_id, { id: entry.item_id, name: entry.item_name?.trim() || moduleName, business: entry.business_name });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [auditEntries, moduleName]);

  const itemEntries = selectedItemId ? auditEntries.filter((entry) => entry.item_id === selectedItemId) : auditEntries;
  const reviewerOptions = useMemo(() => {
    const byIdentity = new Map<string, { identity: string; label: string }>();
    for (const entry of itemEntries) {
      const identity = reviewerIdentity(entry);
      const label = entry.customer_name?.trim() || entry.customer_email || t("reviews.audit.customerFallback");
      const disambiguatedLabel = entry.customer_email && entry.customer_name?.trim() ? `${label} (${entry.customer_email})` : label;
      if (!byIdentity.has(identity)) byIdentity.set(identity, { identity, label: disambiguatedLabel });
    }
    return [...byIdentity.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [itemEntries, t]);

  const filteredEntries = itemEntries
    .filter((entry) => !reviewId || entry.review_id === reviewId)
    .filter((entry) => selectedReviewer === "all" || reviewerIdentity(entry) === selectedReviewer);

  const statusLabel = (status: string): string => {
    const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["approved", "pending", "rejected", "deleted"].includes(normalized)) return t(`reviews.status.${normalized}`);
    return normalized.replace(/_/g, " ").replace(/^\w/, (character) => character.toUpperCase());
  };

  const selectedItemName = itemOptions.find((item) => item.id === selectedItemId)?.name;
  const emptyMessage = !selectedItemId
    ? t("reviews.audit.empty", { module: moduleName })
    : selectedReviewer !== "all"
      ? t("reviews.audit.emptyReviewer")
      : t("reviews.audit.emptyItem", { item: selectedItemName ?? moduleName });

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#06201c]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="platform-review-audit-title" className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
      <header className="flex items-start justify-between gap-4"><div><h2 id="platform-review-audit-title" className="text-lg font-bold text-[#06201c]">{t("reviews.audit.title")}</h2><p className="mt-1 text-sm text-[#52736a]">{t("reviews.audit.description")}</p></div><button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]">{t("reviews.close")}</button></header>
      {!query.isLoading && !query.isError && itemOptions.length ? <div className="mt-5 grid gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-[#315c50]">{t("reviews.audit.itemFilter")}
          <select aria-label={t("reviews.audit.itemFilter")} value={selectedItemId} onChange={(event) => { setSelectedItemId(event.target.value); setSelectedReviewer("all"); }} className="min-h-11 rounded-lg border border-[#cfe0d8] bg-white px-3 font-normal text-[#123d32]">
            <option value="">{t("reviews.audit.allItems", { module: moduleName })}</option>
            {itemOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.business ? ` \u00b7 ${item.business}` : ""}</option>)}
          </select>
        </label>
        {selectedItemId ? <label className="grid gap-1 text-sm font-semibold text-[#315c50]">{t("reviews.audit.reviewerFilter")}
          <select aria-label={t("reviews.audit.reviewerFilter")} value={selectedReviewer} onChange={(event) => setSelectedReviewer(event.target.value)} className="min-h-11 rounded-lg border border-[#cfe0d8] bg-white px-3 font-normal text-[#123d32]">
            <option value="all">{t("reviews.audit.allReviewers")}</option>
            {reviewerOptions.map((reviewer) => <option key={reviewer.identity} value={reviewer.identity}>{reviewer.label}</option>)}
          </select>
        </label> : <p className="self-end pb-2 text-xs text-[#7f9d94]">{t("reviews.audit.chooseItemForReviewer")}</p>}
      </div> : null}
      {query.isLoading ? <p className="mt-5 text-sm text-[#52736a]">{t("reviews.audit.loading")}</p> : null}
      {query.isError ? <div role="alert" className="mt-5 text-sm text-[#b42318]">{(query.error as Error).message} <button type="button" onClick={() => void query.refetch()} className="font-bold underline">{t("reviews.retry")}</button></div> : null}
      {!query.isLoading && !query.isError && !filteredEntries.length ? <p className="mt-5 text-sm text-[#52736a]">{emptyMessage}</p> : null}
      {filteredEntries.length ? <ol className="mt-5 grid gap-3">{filteredEntries.map((entry) => {
        const stamp = normalizeUtcDate(entry.created_at);
        const date = stamp ? new Date(stamp) : null;
        const dateText = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : t("reviews.dateUnavailable");
        return <li key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-[#06201c]">{entry.from_status ? `${statusLabel(entry.from_status)} \u2192 ` : ""}{statusLabel(entry.to_status)}</p><time className="text-xs text-[#7f9d94]">{dateText}</time></div><p className="mt-1 text-sm text-[#52736a]">{entry.item_name ?? moduleName}</p><p className="mt-1 text-xs text-[#7f9d94]">{auditActorLabel(entry)}</p>{entry.reason ? <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-[#fff8e8] px-3 py-2 text-sm text-[#805900]">{t("reviews.audit.reason", { reason: entry.reason })}</p> : null}</li>;
      })}</ol> : null}
    </section>
  </div>;
}
