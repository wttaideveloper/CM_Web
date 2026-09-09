"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import TrainingApprovalDialog from "./TrainingApprovalDialog";
import {
  getTrainingModerationHistory,
  type TrainingApprovalDecision,
  type ModerationHistoryEntry,
} from "./training-approval.service";
import type { TrainingApprovalReview } from "./training-approval-review.types";
import { EnterpriseDisplayName, TenantDisplayName } from "./EventOwnershipNames";

type DisplayRow = { label: string; value: React.ReactNode };

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function enumLabel(value: string | null | undefined): string {
  return hasText(value) ? value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()) : "Not provided";
}

function wallClockDateTime(value: string | null | undefined): string {
  if (!hasText(value)) return "Not provided";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const dateLabel = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(date);
  if (!hour || !minute) return dateLabel;
  const time = new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute), Number(second ?? "0")));
  const timeLabel = new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: "UTC" }).format(time);
  return `${dateLabel}, ${timeLabel}`;
}

function priceLabel(price: string | null | undefined, currency: string | null | undefined): string | null {
  if (!hasText(price)) return null;
  const number = Number(price);
  if (Number.isFinite(number) && hasText(currency)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(number);
    } catch {
      return `${price} ${currency}`;
    }
  }
  return hasText(currency) ? `${price} ${currency}` : price;
}

function stringTags(tags: unknown[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

function DetailGrid({ rows }: { rows: DisplayRow[] }) {
  if (rows.length === 0) return null;
  return <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{rows.map((row) => <div key={row.label}><dt className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">{row.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-[#284940]">{row.value}</dd></div>)}</dl>;
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-[#e1ebe6] pt-6 first:border-t-0 first:pt-0"><h3 className="text-lg font-bold text-[#06201c]">{title}</h3><div className="mt-4">{children}</div></section>;
}

/** Renders the complete backend-backed Training dossier for Super Admin review without mutation controls. */
export default function TrainingApprovalReview({
  training,
  approvalPending,
  approvalError,
  onDecision,
}: {
  training: TrainingApprovalReview;
  approvalPending: boolean;
  approvalError: string | null;
  onDecision: (action: TrainingApprovalDecision, reason?: string) => void;
}) {
  const [decision, setDecision] = useState<TrainingApprovalDecision | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement>(null);
  const closeConfirmation = () => {
    setDecision(null);
    window.setTimeout(() => approveButtonRef.current?.focus(), 0);
  };
  const basePrice = priceLabel(training.price, training.currency);
  const tags = stringTags(training.tags);
  const sectionCount = Array.isArray(training.sections) ? training.sections.length : null;
  const assessmentCount = Array.isArray(training.assessments) ? training.assessments.length : null;

  const historyQuery = useQuery({
    queryKey: ["trainings", "moderation-history", training.id],
    queryFn: () => getTrainingModerationHistory(training.id),
    staleTime: 30_000,
    retry: 1,
  });
  const history = historyQuery.data ?? [];

  return <div className="mt-5 space-y-6 text-sm text-[#52736a]">
    <ReviewSection title="Training Overview"><DetailGrid rows={[{ label: "Training title", value: training.title }, ...(hasText(training.description) ? [{ label: "Description", value: training.description }] : []), { label: "Category", value: training.category }, ...(hasText(training.subcategory) ? [{ label: "Subcategory", value: training.subcategory }] : []), { label: "Status", value: enumLabel(training.status) }, ...(hasText(training.delivery_mode) ? [{ label: "Delivery mode", value: enumLabel(training.delivery_mode) }] : []), ...(hasText(training.course_type) ? [{ label: "Course type", value: enumLabel(training.course_type) }] : [])]} />{tags.length ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Tags</p><div className="mt-2 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full bg-[#edf3f0] px-3 py-1 font-semibold text-[#284940]">{tag}</span>)}</div></div> : null}</ReviewSection>
    <ReviewSection title="Enterprise / Ownership"><DetailGrid rows={[{ label: "Enterprise", value: <EnterpriseDisplayName enterpriseId={training.enterprise_id} eventEnterpriseName={training.enterprise_name} /> }, { label: "Tenant", value: <TenantDisplayName tenantId={training.tenant_id} /> }, ...(hasText(training.location_id) ? [{ label: "Location", value: training.location_id }] : [])]} /></ReviewSection>
    {(basePrice || hasText(training.capacity)) ? <ReviewSection title="Pricing & Capacity"><DetailGrid rows={[...(basePrice ? [{ label: "Price", value: basePrice }] : []), ...(basePrice ? [{ label: "Admission", value: Number(training.price) === 0 ? "Free" : "Paid" }] : []), ...(hasText(training.capacity) ? [{ label: "Capacity", value: training.capacity }] : [])]} /></ReviewSection> : null}
    {(sectionCount !== null || assessmentCount !== null) ? <ReviewSection title="Content Structure"><DetailGrid rows={[...(sectionCount !== null ? [{ label: "Sections", value: String(sectionCount) }] : []), ...(assessmentCount !== null ? [{ label: "Assessments", value: String(assessmentCount) }] : [])]} /></ReviewSection> : null}
    <ReviewSection title="Record Information"><DetailGrid rows={[{ label: "Current status", value: enumLabel(training.status) }, ...(hasText(training.created_at) ? [{ label: "Created", value: wallClockDateTime(training.created_at) }] : []), ...(hasText(training.updated_at) ? [{ label: "Last updated", value: wallClockDateTime(training.updated_at) }] : [])]} /></ReviewSection>
    <ReviewSection title="Moderation History">{historyQuery.isLoading ? <p className="text-xs text-[#7f9d94]">Loading history…</p> : history.length === 0 ? <p className="text-xs text-[#7f9d94]">No moderation history recorded for this training.</p> : <ol className="relative ml-3 border-l-2 border-[#e1ebe6] space-y-5">{history.map((entry, index) => {
      const label = entry.action ?? entry.status ?? "—";
      const from = entry.from_status;
      const to = entry.to_status ?? entry.status;
      const reason = entry.reason;
      const who = entry.performed_by;
      const when = entry.created_at ?? entry.timestamp;
      return <li key={entry.id ?? `history-${index}`} className="pl-6 relative before:absolute before:left-[-5px] before:top-1 before:h-2 before:w-2 before:rounded-full before:bg-[#1f6a58]">
        <p className="font-bold text-[#284940]">{enumLabel(String(label))}{from && to ? <span className="font-normal text-[#52736a]"> — {enumLabel(String(from))} → {enumLabel(String(to))}</span> : null}</p>
        {hasText(who) ? <p className="text-xs text-[#7f9d94]">by {who}</p> : null}
        {hasText(reason) ? <p className="mt-1 rounded-lg bg-[#f9fcfa] px-3 py-2 text-xs text-[#52736a]">{reason}</p> : null}
        {hasText(when) ? <p className="mt-1 text-xs text-[#7f9d94]">{wallClockDateTime(when)}</p> : null}
      </li>;
    })}</ol>}</ReviewSection>
    {training.status === "pending_approval" ? <section className="rounded-2xl border border-[#cde5db] bg-[#f4faf7] p-5"><h3 className="text-lg font-bold text-[#06201c]">Review this Training</h3><p className="mt-2">Approve it, request a revision, or reject it using the backend approval workflow.</p><div className="mt-4 flex flex-wrap gap-3"><button ref={approveButtonRef} type="button" onClick={() => setDecision("approve")} disabled={approvalPending} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">Approve Training</button><button type="button" onClick={() => setDecision("request_changes")} disabled={approvalPending} className="h-11 rounded-full border border-[#b7791f] px-5 text-sm font-bold text-[#8a5a00] disabled:cursor-not-allowed disabled:opacity-60">Request Changes</button><button type="button" onClick={() => setDecision("reject")} disabled={approvalPending} className="h-11 rounded-full border border-[#b42318] px-5 text-sm font-bold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">Reject Training</button></div></section> : null}
    <TrainingApprovalDialog action={decision} trainingTitle={training.title} pending={approvalPending} error={approvalError} onCancel={closeConfirmation} onConfirm={(reason) => { if (decision) onDecision(decision, reason); }} />
  </div>;
}