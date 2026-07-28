"use client";

import Link from "next/link";
import { useState } from "react";

import {
  deleteOnboardingForm,
  duplicateOnboardingForm,
  publishOnboardingForm,
  unpublishOnboardingForm,
} from "../../services/onboarding-form.service";
import type { FormStatus, OnboardingFormListItem } from "../../types/onboarding-form.types";

function statusBadgeClass(status: FormStatus) {
  if (status === "draft") return "bg-[#f1f4f3] text-[#6b7f79]";
  if (status === "inactive") return "bg-[#fff3e6] text-[#a15c00]";
  return "bg-[#e8f6ee] text-[#16825b]";
}

function statusLabel(status: FormStatus) {
  if (status === "draft") return "Draft";
  if (status === "inactive") return "Inactive";
  return "Published";
}

function getRegistrationTypeLabel(value?: string | null) {
  if (value === "enterprise") return "Enterprise";
  if (value === "individual") return "Individual";
  return "No registration type";
}

function hasEnterpriseType(value?: string | null) {
  return Boolean(value && value.trim());
}

function getEnterpriseTypeLabel(value?: string | null) {
  return hasEnterpriseType(value) ? value!.trim() : "No enterprise type";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function OnboardingFormCard({
  form,
  onRefresh,
  onBusyChange,
}: {
  form: OnboardingFormListItem;
  onRefresh: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function runAction(action: () => Promise<void | boolean>) {
    setActionError(null);
    setIsWorking(true);
    onBusyChange(true);

    try {
      const shouldRefresh = await action();
      if (shouldRefresh !== false) await onRefresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setIsWorking(false);
      onBusyChange(false);
    }
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#bcd8cf] hover:shadow-[0_14px_30px_rgba(15,63,52,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="min-w-0 min-h-[58px] overflow-hidden text-[16px] font-extrabold leading-[1.2] tracking-tight text-[#031d18] [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]">
            {form.name}
          </h3>
          <p className="mt-2 min-h-[48px] text-[14px] leading-[1.45] text-[#41675e] line-clamp-2">{form.description || "—"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasEnterpriseType(form.enterprise_type) ? "bg-[#eef6f2] text-[#1f6a58]" : "bg-[#f1f4f3] text-[#6b7f79]"}`}>
              {getEnterpriseTypeLabel(form.enterprise_type)}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.registration_type === "enterprise" || form.registration_type === "individual" ? "bg-[#eef6f2] text-[#1f6a58]" : "bg-[#f1f4f3] text-[#6b7f79]"}`}>
              {getRegistrationTypeLabel(form.registration_type)}
            </span>
          </div>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(form.status)}`}>{statusLabel(form.status)}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        {[
          { label: "Sections", value: form.sections_count },
          { label: "Fields", value: form.fields_count },
          { label: "Assigned", value: form.assigned_count },
          { label: "Created", value: formatDate(form.created_at) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-[#f9fcfa] px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{item.label}</p>
            <p
              className={`mt-1 text-[#06201c] ${
                item.label === "Created" ? "text-xs font-semibold" : "font-bold"
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-[#f9fcfa] px-3 py-3 text-xs text-[#52736a]"><span className="font-bold text-[#06201c]">Updated: </span>{formatDate(form.updated_at)}</div>
      {actionError ? <p className="mt-4 rounded-xl border border-[#f8d7da] bg-[#fff5f5] px-3 py-2 text-sm text-[#b42318]">{actionError}</p> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/onboarding-forms/${form.id}`} className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Preview</Link>
        <Link href={`/onboarding-forms/${form.id}/edit`} className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Edit</Link>
        {form.status === "draft" ? <button type="button" disabled={isWorking} onClick={() => runAction(async () => { await publishOnboardingForm(form.id); })} className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60">Publish</button> : null}
        {form.status === "published" ? <button type="button" disabled={isWorking} onClick={() => runAction(async () => { await unpublishOnboardingForm(form.id); })} className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60">Unpublish</button> : null}
        <button type="button" disabled={isWorking} onClick={() => runAction(async () => { await duplicateOnboardingForm(form.id, `Copy of ${form.name}`); })} className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-60">Duplicate</button>
        <button type="button" disabled={isWorking} onClick={() => runAction(async () => { const confirmed = window.confirm(`Delete "${form.name}"?`); if (!confirmed) return false; await deleteOnboardingForm(form.id); return true; })} className="rounded-full border border-[#efd4d1] px-3 py-2 text-xs font-semibold text-[#b42318] hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60">Delete</button>
      </div>
    </article>
  );
}
