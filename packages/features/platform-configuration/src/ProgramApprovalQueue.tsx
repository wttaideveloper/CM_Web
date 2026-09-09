"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import ProgramApprovalReviewPanel from "./ProgramApprovalReview";
import { EnterpriseDisplayName } from "./EventOwnershipNames";
import { approveProgramReview, getProgramApprovalReview, rejectProgramReview, type ProgramApprovalDecision } from "./program-approval.service";
import type { ProgramApprovalReview } from "./program-approval-review.types";
import {
  getProgramApprovalList,
  programApprovalListQueryKey,
  type ProgramApprovalListItem,
  type ProgramApprovalStatus,
} from "./program-approval-queries";

type Status = ProgramApprovalStatus;
type ApprovalMutationVariables = { programId: string; action: ProgramApprovalDecision; reason?: string };

function formatDate(value: string | null | undefined): string {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))))
    : "Not provided";
}

function approvalStatusLabel(status: Status): string {
  if (status === "pending_approval") return "Pending Approval";
  if (status === "needs_revision") return "Requested Changes";
  return "Approved";
}

/** Displays the Programs approval workspace for the Platform Super Admin. */
export default function ProgramApprovalQueue() {
  const client = useQueryClient();
  const [status, setStatus] = useState<Status>("pending_approval");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<Record<Status, number>>({ pending_approval: 1, needs_revision: 1, approved: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(input.trim());
      setPages({ pending_approval: 1, needs_revision: 1, approved: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  const pending = useQuery({
    queryKey: programApprovalListQueryKey("pending_approval", pages.pending_approval, search),
    queryFn: () => getProgramApprovalList("pending_approval", pages.pending_approval, search),
  });
  const approved = useQuery({
    queryKey: programApprovalListQueryKey("approved", pages.approved, search),
    queryFn: () => getProgramApprovalList("approved", pages.approved, search),
  });
  const requestedChanges = useQuery({
    queryKey: programApprovalListQueryKey("needs_revision", pages.needs_revision, search),
    queryFn: () => getProgramApprovalList("needs_revision", pages.needs_revision, search),
  });
  const active = status === "pending_approval" ? pending : status === "needs_revision" ? requestedChanges : approved;
  const list = active.data;
  const label = approvalStatusLabel(status);
  const reviewQuery = useQuery({
    queryKey: ["platform", "program-approval-detail", selectedId],
    queryFn: () => getProgramApprovalReview(selectedId ?? ""),
    enabled: Boolean(selectedId),
  });
  const approval = useMutation({
    mutationFn: ({ programId, action, reason }: ApprovalMutationVariables) => {
      if (action === "approve") return approveProgramReview(programId);
      return rejectProgramReview(programId, reason);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["platform", "program-approval-list", "pending_approval"] }),
        client.invalidateQueries({ queryKey: ["platform", "program-approval-list", "needs_revision"] }),
        client.invalidateQueries({ queryKey: ["platform", "program-approval-list", "approved"] }),
        client.invalidateQueries({ queryKey: ["platform", "program-approval-detail", variables.programId] }),
      ]);
      setSelectedId(null);
      setSuccess(variables.action === "approve" ? "Program approved successfully." : "Program rejected successfully.");
    },
  });

  const switchStatus = (next: Status) => {
    setStatus(next);
    setSelectedId(null);
    setSuccess(null);
  };
  const emptyTitle = status === "pending_approval" ? "No programs awaiting approval" : status === "needs_revision" ? "No programs with requested changes" : "No approved programs";
  const emptyText = status === "pending_approval" ? "Submitted programs will appear here when they need review." : status === "needs_revision" ? "Programs with requested changes will appear here until they are resubmitted." : "Approved programs will appear here once the backend records the approved state.";

  return <section id="approval-type-programs-panel" role="tabpanel" aria-labelledby="approval-type-programs-tab">
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#7f9d94]">PROGRAM APPROVALS</p>
        <h2 className="mt-1 text-xl font-bold text-[#06201c]">Program approvals</h2>
        <p className="mt-1 text-sm text-[#52736a]">{status === "pending_approval" ? "Review programs submitted by enterprises for approval." : status === "needs_revision" ? "Review Programs waiting for Enterprise Admin revisions." : "Programs approved and awaiting publication."}</p>
      </div>
      {list ? <p className="font-bold text-[#1f6a58]">{list.pagination.total} {label}</p> : null}
    </div>

    <div role="tablist" aria-label="Program approval status" className="mt-5 flex gap-2 border-b border-[#d7e5df]">
      <StatusTab id="program-pending-tab" active={status === "pending_approval"} onClick={() => switchStatus("pending_approval")}>Pending Approval</StatusTab>
      <StatusTab id="program-requested-changes-tab" active={status === "needs_revision"} onClick={() => switchStatus("needs_revision")}>Requested Changes</StatusTab>
      <StatusTab id="program-approved-tab" active={status === "approved"} onClick={() => switchStatus("approved")}>Approved</StatusTab>
    </div>
    <label className="mt-5 block max-w-md">
      <span className="sr-only">Search programs</span>
      <input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search programs..." className="h-11 w-full rounded-xl border border-[#d7e5df] px-4 outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20" />
    </label>
    {success ? <p role="status" className="mt-5 rounded-xl bg-[#e9f4ee] p-4 font-semibold text-[#1f6a58]">{success}</p> : null}

    <div id="program-approval-events" role="tabpanel" aria-labelledby={status === "pending_approval" ? "program-pending-tab" : status === "needs_revision" ? "program-requested-changes-tab" : "program-approved-tab"}>
      {active.isLoading ? <div role="status" className="mt-6 space-y-3">{[1, 2, 3].map((number) => <div key={number} className="h-32 animate-pulse rounded-2xl bg-[#edf3f0]" />)}</div> : null}
      {active.isError ? <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><p role="alert" className="font-semibold text-[#b42318]">Unable to load {label.toLowerCase()} programs.</p><button type="button" onClick={() => void active.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : null}
      {!active.isLoading && !active.isError && list?.items.length === 0 ? <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm"><p className="font-bold">{emptyTitle}</p><p className="mt-2 text-sm text-[#52736a]">{emptyText}</p></div> : null}
      {!active.isLoading && !active.isError && list?.items.length ? <>
        <div className="mt-6 space-y-4">{list.items.map((program) => <ApprovalProgramCard key={program.id} program={program} label={label} onReview={() => setSelectedId(program.id)} />)}</div>
        {selectedId ? <ReviewPanel selectedId={selectedId} fallback={list.items.find((program) => program.id === selectedId)} reviewQuery={reviewQuery} approval={approval} onClose={() => setSelectedId(null)} /> : null}
        {list.pagination.total_pages > 1 ? <nav aria-label={`${label} Program pages`} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" disabled={list.pagination.page <= 1} onClick={() => setPages((current) => ({ ...current, [status]: current[status] - 1 }))} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">Previous</button><span className="text-sm text-[#52736a]">Page {list.pagination.page} of {list.pagination.total_pages}</span><button type="button" disabled={list.pagination.page >= list.pagination.total_pages} onClick={() => setPages((current) => ({ ...current, [status]: current[status] + 1 }))} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">Next</button></nav> : null}
      </> : null}
    </div>
  </section>;
}

function StatusTab({ id, active, onClick, children }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button id={id} type="button" role="tab" aria-selected={active} aria-controls="program-approval-events" onClick={onClick} className={active ? "border-b-2 border-[#1f6a58] px-4 py-3 font-bold text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2" : "px-4 py-3 font-bold text-[#52736a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2"}>{children}</button>;
}

function ApprovalProgramCard({ program, label, onReview }: { program: ProgramApprovalListItem; label: string; onReview: () => void }) {
  const price = program.price ? (Number(program.price) === 0 ? "Free" : program.price) : "Free";

  return <article className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <div aria-hidden="true" className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#1f6a58] to-[#8ac7a7]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.3)_0_1px,transparent_1px)] bg-[length:20px_20px]" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-[#06201c]">{program.title}</h3><span className={program.status === "approved" ? "rounded-full bg-[#e9f4ee] px-3 py-1 text-xs font-bold text-[#1f6a58]" : "rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-bold text-[#8a5a00]"}>{label}</span></div>
          <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm text-[#52736a] sm:grid-cols-2">
            <ApprovalField label="Enterprise"><EnterpriseDisplayName enterpriseId={program.enterprise_id} eventEnterpriseName={program.enterprise_name} /></ApprovalField>
            <ApprovalField label="Category">{program.category}</ApprovalField>
            <ApprovalField label="Price">{price}</ApprovalField>
            <ApprovalField label="Submitted">{formatDate(program.created_at)}</ApprovalField>
          </dl>
        </div>
      </div>
      <button type="button" onClick={onReview} className="h-10 shrink-0 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">Review</button>
    </div>
  </article>;
}

function ApprovalField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="font-semibold text-[#06201c]">{label}</dt><dd className="mt-0.5 break-words">{children}</dd></div>;
}

function ReviewPanel({ selectedId, fallback, reviewQuery, approval, onClose }: { selectedId: string; fallback?: ProgramApprovalListItem; reviewQuery: { data?: ProgramApprovalReview; isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> }; approval: { isPending: boolean; isError: boolean; mutate: (variables: ApprovalMutationVariables) => void }; onClose: () => void }) {
  const program = reviewQuery.data ?? fallback;
  return <section aria-labelledby="program-review-title" className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#7f9d94]">READ-ONLY PROGRAM REVIEW</p><h2 id="program-review-title" className="mt-1 text-xl font-bold text-[#06201c]">{program?.title ?? "Program review"}</h2></div><button type="button" onClick={onClose} className="font-semibold text-[#1f6a58] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">Close</button></div>{!program ? (reviewQuery.isLoading ? <div role="status" className="mt-5 space-y-3"><div className="h-8 animate-pulse rounded bg-[#edf3f0]" /><div className="h-24 animate-pulse rounded bg-[#edf3f0]" /></div> : <div className="mt-5"><p role="alert" className="font-semibold text-[#b42318]">Unable to load program details.</p><button type="button" onClick={() => void reviewQuery.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div>) : <ProgramApprovalReviewPanel program={program} approvalPending={approval.isPending} approvalError={approval.isError ? "Unable to apply this Program approval decision. Please try again." : null} onDecision={(action, reason) => approval.mutate({ programId: selectedId, action, reason })} />}</section>;
}