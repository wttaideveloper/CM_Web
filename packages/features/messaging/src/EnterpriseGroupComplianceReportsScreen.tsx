"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@ihp/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GroupChatApiError, listGroupChatComplianceReports, updateGroupChatComplianceReport } from "./group-chat/group-chat.service";
import { canAccessGroupChatComplianceReports, GROUP_CHAT_REPORT_REASONS, isValidGroupChatUuid } from "./group-chat-models";
import type { GroupChatComplianceReport, GroupChatComplianceReportListResponse, GroupChatComplianceReportStatus, GroupChatComplianceReportUpdateStatus } from "./group-chat/group-chat.types";

const PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS: readonly { value: number; label: string }[] = [
  { value: PAGE_SIZE, label: `${PAGE_SIZE} (current)` },
  { value: 1, label: "1" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
];
const REPORT_STATUS_OPTIONS: readonly { value: "" | GroupChatComplianceReportStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

function formatReportDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getReasonLabel(reason: string): string {
  return GROUP_CHAT_REPORT_REASONS.find((option) => option.value === reason)?.label ?? reason;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof GroupChatApiError && error.status === 403) return "You do not have access to Compliance reports.";
  if (error instanceof Error) return error.message;
  return "Unable to load Compliance reports.";
}

function StatusBadge({ status }: { status: GroupChatComplianceReportStatus }) {
  const className = status === "resolved" ? "bg-[#e8f6ee] text-[#1f6a58]" : status === "dismissed" ? "bg-[#f4f1f1] text-[#6b5b5b]" : status === "reviewing" ? "bg-[#fff3d6] text-[#8b5e00]" : "bg-[#fff7f6] text-[#7a271a]";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function ReportCard({ report, selected, onSelect }: { report: GroupChatComplianceReport; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={`w-full rounded-xl border p-4 text-left transition-colors ${selected ? "border-[#1f6a58] bg-[#e8f6ee]" : "border-[#e1ebe6] bg-white hover:bg-[#f4faf7]"}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#16332b]">{report.message_id ? "Message report" : "Group report"}</p><p className="mt-1 text-xs text-[#52736a]">{getReasonLabel(report.reason)} · {formatReportDate(report.created_at)}</p></div><StatusBadge status={report.status} /></div>
  </button>;
}

function ReportDetails({ report, onUpdated }: { report: GroupChatComplianceReport; onUpdated: (report: GroupChatComplianceReport) => void }) {
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: (status: GroupChatComplianceReportUpdateStatus) => updateGroupChatComplianceReport(report.id, { status, note: note.trim() || null }),
    retry: false,
    onSuccess: (updated) => { setNote(""); onUpdated(updated); },
  });
  const actions: readonly GroupChatComplianceReportUpdateStatus[] = ["reviewing", "resolved", "dismissed"];
  return <section aria-label="Report details" className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Compliance report</p><h2 className="mt-1 text-lg font-bold text-[#06201c]">{report.message_id ? "Reported message" : "Reported group"}</h2></div><StatusBadge status={report.status} /></div><dl className="mt-5 grid gap-3 text-sm text-[#16332b] sm:grid-cols-2"><div><dt className="font-semibold text-[#52736a]">Reason</dt><dd>{getReasonLabel(report.reason)}</dd></div><div><dt className="font-semibold text-[#52736a]">Submitted</dt><dd>{formatReportDate(report.created_at)}</dd></div><div><dt className="font-semibold text-[#52736a]">Group</dt><dd>Authorized group reference available</dd></div><div><dt className="font-semibold text-[#52736a]">Reporter</dt><dd>Authorized reporter reference available</dd></div>{report.resolved_at ? <div><dt className="font-semibold text-[#52736a]">Resolved</dt><dd>{formatReportDate(report.resolved_at)}</dd></div> : null}{report.details ? <div className="sm:col-span-2"><dt className="font-semibold text-[#52736a]">Details</dt><dd className="mt-1 whitespace-pre-wrap">{report.details}</dd></div> : null}{report.resolution_note ? <div className="sm:col-span-2"><dt className="font-semibold text-[#52736a]">Review note</dt><dd className="mt-1 whitespace-pre-wrap">{report.resolution_note}</dd></div> : null}</dl><div className="mt-5 border-t border-[#e1ebe6] pt-4"><label className="block text-sm font-semibold text-[#16332b]" htmlFor="compliance-review-note">Optional review note<textarea id="compliance-review-note" value={note} onChange={(event) => setNote(event.target.value)} disabled={mutation.isPending} rows={3} className="mt-1 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 font-normal" /></label>{mutation.isError ? <p role="alert" className="mt-3 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]">{getErrorMessage(mutation.error)}</p> : null}{mutation.isSuccess ? <p role="status" className="mt-3 rounded-lg border border-[#c7e8d4] bg-[#e8f6ee] p-3 text-sm text-[#1f6a58]">Report status updated successfully.</p> : null}<div className="mt-3 flex flex-wrap gap-2">{actions.map((status) => <button key={status} type="button" disabled={mutation.isPending || report.status === status} onClick={() => mutation.mutate(status)} className="rounded-full border border-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-40">{mutation.isPending && mutation.variables === status ? "Saving..." : `Mark ${status}`}</button>)}</div></div></section>;
}

/** Renders the clinic-scoped Compliance report review surface for authorized Enterprise users. */
export default function EnterpriseGroupComplianceReportsScreen() {
  const { roles, user } = useAuth();
  const userScope = user?.userId ?? user?.id ?? "";
  const accessScope = [userScope, roles?.tenantSlug ?? "", roles?.tenantRole ?? "", ...(roles?.tenantRbacRoles ?? [])].join("|");
  const canAccess = canAccessGroupChatComplianceReports(roles);
  const [status, setStatus] = useState<"" | GroupChatComplianceReportStatus>("");
  const [groupId, setGroupId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<GroupChatComplianceReport | null>(null);
  useEffect(() => {
    setSelectedReportId(null);
    setSelectedOverride(null);
  }, [canAccess, accessScope]);
  const groupFilterInvalid = groupId.trim().length > 0 && !isValidGroupChatUuid(groupId.trim());
  const query = useQuery({
    queryKey: ["group-chat", "compliance-reports", accessScope, status, groupId.trim(), page, pageSize],
    queryFn: ({ signal }) => listGroupChatComplianceReports({ status: status || undefined, groupId: groupId.trim() || undefined, page, pageSize, signal }),
    enabled: canAccess && Boolean(userScope) && !groupFilterInvalid,
    staleTime: 15000,
    retry: false,
  });
  const queryClient = useQueryClient();
  const reports = query.data?.items ?? [];
  const selectedReport = selectedOverride ?? reports.find((report) => report.id === selectedReportId) ?? null;
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));

  const handleUpdated = (updated: GroupChatComplianceReport) => {
    setSelectedOverride(updated);
    setSelectedReportId(updated.id);
    queryClient.setQueriesData<GroupChatComplianceReportListResponse>({ queryKey: ["group-chat", "compliance-reports", accessScope] }, (current) => current ? { total: current.total, items: current.items.map((report) => report.id === updated.id ? updated : report) } : current);
    void queryClient.invalidateQueries({ queryKey: ["group-chat", "compliance-reports", accessScope] });
  };

  if (!canAccess) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><h1 className="text-xl font-bold text-[#06201c]">Compliance Reports</h1><p className="mt-2 text-sm text-[#52736a]">Compliance reports are available only to authorized clinic administrators.</p></section>;
  if (groupFilterInvalid) return <ReportLayout title="Compliance Reports"><FilterBar status={status} groupId={groupId} pageSize={pageSize} onStatus={(value) => { setStatus(value); setPage(1); setSelectedReportId(null); setSelectedOverride(null); }} onGroupId={(value) => { setGroupId(value); setPage(1); setSelectedReportId(null); setSelectedOverride(null); }} onPageSize={(value) => { setPageSize(value); setPage(1); setSelectedReportId(null); setSelectedOverride(null); }} /><p role="alert" className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]">Enter a valid Group UUID or clear the Group filter.</p></ReportLayout>;
  return <ReportLayout title="Compliance Reports"><FilterBar status={status} groupId={groupId} pageSize={pageSize} onStatus={(value) => { setStatus(value); setPage(1); setSelectedReportId(null); setSelectedOverride(null); }} onGroupId={(value) => { setGroupId(value); setPage(1); setSelectedReportId(null); setSelectedOverride(null); }} onPageSize={(value) => { setPageSize(value); setPage(1); setSelectedReportId(null); setSelectedOverride(null); }} />{query.isPending ? <p className="rounded-xl bg-[#f9fcfa] p-5 text-sm text-[#52736a]" aria-live="polite">Loading Compliance reports...</p> : query.isError ? <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm text-[#7a271a]">{getErrorMessage(query.error)}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></div> : <><div className="flex items-center justify-between text-sm text-[#52736a]"><span>{query.data?.total ?? 0} total reports</span>{query.isFetching ? <span aria-live="polite">Updating...</span> : null}</div>{reports.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">No Compliance reports match these filters.</p> : <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><div className="space-y-2">{reports.map((report) => <ReportCard key={report.id} report={report} selected={report.id === selectedReportId} onSelect={() => { setSelectedReportId(report.id); setSelectedOverride(null); }} />)}<Pagination page={page} totalPages={totalPages} onChange={(nextPage) => { setPage(nextPage); setSelectedReportId(null); setSelectedOverride(null); }} /></div><div>{selectedReport ? <ReportDetails report={selectedReport} onUpdated={handleUpdated} /> : <p className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">Select a report to review its details.</p>}</div></div>}</>}</ReportLayout>;
}

function ReportLayout({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Compliance</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">{title}</h1><p className="mt-1 text-sm text-[#52736a]">Review clinic Group Chat reports without opening private conversation history.</p></div>{children}</section>;
}

function FilterBar({ status, groupId, pageSize, onStatus, onGroupId, onPageSize }: { status: "" | GroupChatComplianceReportStatus; groupId: string; pageSize: number; onStatus: (value: "" | GroupChatComplianceReportStatus) => void; onGroupId: (value: string) => void; onPageSize: (value: number) => void }) {
  return <div className="grid gap-3 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(9rem,0.6fr)]"><label className="text-sm font-semibold text-[#16332b]">Status<select value={status} onChange={(event) => onStatus(event.target.value as "" | GroupChatComplianceReportStatus)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal">{REPORT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-sm font-semibold text-[#16332b]">Group UUID filter<span className="font-normal text-[#52736a]"> (optional)</span><input value={groupId} onChange={(event) => onGroupId(event.target.value)} placeholder="Filter by authorized Group UUID" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal" /></label><label className="text-sm font-semibold text-[#16332b]">Page size<select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal">{PAGE_SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <div className="mt-3 flex items-center justify-between text-xs text-[#52736a]"><span>Page {page} of {totalPages}</span><span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></span></div>;
}
