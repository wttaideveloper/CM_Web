"use client";

import { useRef, useState } from "react";
import ProgramApprovalDialog from "./ProgramApprovalDialog";
import type { ProgramApprovalDecision } from "./program-approval.service";
import type { ProgramApprovalReview } from "./program-approval-review.types";
import { EnterpriseDisplayName } from "./EventOwnershipNames";

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

function priceLabel(price: string | null | undefined): string | null {
  if (!hasText(price)) return null;
  const number = Number(price);
  if (Number.isFinite(number)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(number);
    } catch {
      return price;
    }
  }
  return price;
}

function DetailGrid({ rows }: { rows: DisplayRow[] }) {
  if (rows.length === 0) return null;
  return <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{rows.map((row) => <div key={row.label}><dt className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">{row.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-[#284940]">{row.value}</dd></div>)}</dl>;
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-[#e1ebe6] pt-6 first:border-t-0 first:pt-0"><h3 className="text-lg font-bold text-[#06201c]">{title}</h3><div className="mt-4">{children}</div></section>;
}

/** Renders the complete backend-backed Program dossier for Super Admin review without mutation controls. */
export default function ProgramApprovalReview({
  program,
  approvalPending,
  approvalError,
  onDecision,
}: {
  program: ProgramApprovalReview;
  approvalPending: boolean;
  approvalError: string | null;
  onDecision: (action: ProgramApprovalDecision, reason?: string) => void;
}) {
  const [decision, setDecision] = useState<ProgramApprovalDecision | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement>(null);
  const closeConfirmation = () => {
    setDecision(null);
    window.setTimeout(() => approveButtonRef.current?.focus(), 0);
  };
  const basePrice = priceLabel(program.price);
  const phaseCount = Array.isArray(program.phases) ? program.phases.length : null;

  return <div className="mt-5 space-y-6 text-sm text-[#52736a]">
    <ReviewSection title="Program Overview"><DetailGrid rows={[{ label: "Program title", value: program.title }, ...(hasText(program.description) ? [{ label: "Description", value: program.description }] : []), { label: "Category", value: program.category }, { label: "Status", value: enumLabel(program.status) }, ...(hasText(program.delivery_mode) ? [{ label: "Delivery mode", value: enumLabel(program.delivery_mode) }] : [])]} /></ReviewSection>
    <ReviewSection title="Enterprise / Ownership"><DetailGrid rows={[{ label: "Enterprise", value: <EnterpriseDisplayName enterpriseId={program.enterprise_id} eventEnterpriseName={program.enterprise_name} /> }]} /></ReviewSection>
    {basePrice ? <ReviewSection title="Pricing"><DetailGrid rows={[{ label: "Price", value: basePrice }, { label: "Admission", value: Number(program.price) === 0 ? "Free" : "Paid" }]} /></ReviewSection> : null}
    {phaseCount !== null ? <ReviewSection title="Content Structure"><DetailGrid rows={[{ label: "Phases", value: String(phaseCount) }]} /></ReviewSection> : null}
    <ReviewSection title="Record Information"><DetailGrid rows={[{ label: "Current status", value: enumLabel(program.status) }, ...(hasText(program.created_at) ? [{ label: "Created", value: wallClockDateTime(program.created_at) }] : []), ...(hasText(program.updated_at) ? [{ label: "Last updated", value: wallClockDateTime(program.updated_at) }] : [])]} /></ReviewSection>
    {program.status === "pending_approval" ? <section className="rounded-2xl border border-[#cde5db] bg-[#f4faf7] p-5"><h3 className="text-lg font-bold text-[#06201c]">Review this Program</h3><p className="mt-2">Approve it or reject it using the backend approval workflow.</p><div className="mt-4 flex flex-wrap gap-3"><button ref={approveButtonRef} type="button" onClick={() => setDecision("approve")} disabled={approvalPending} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">Approve Program</button><button type="button" onClick={() => setDecision("reject")} disabled={approvalPending} className="h-11 rounded-full border border-[#b42318] px-5 text-sm font-bold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">Reject Program</button></div></section> : null}
    <ProgramApprovalDialog action={decision} programTitle={program.title} pending={approvalPending} error={approvalError} onCancel={closeConfirmation} onConfirm={(reason) => { if (decision) onDecision(decision, reason); }} />
  </div>;
}