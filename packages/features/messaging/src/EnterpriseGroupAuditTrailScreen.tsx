"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@ihp/auth";
import { useQuery } from "@tanstack/react-query";
import { GroupChatApiError, getGroupChat, listGroupChatAudit, listGroupChatComplianceGroups, listGroupChatMembers } from "./group-chat/group-chat.service";
import { canAccessGroupChatComplianceReports, canViewGroupChatAudit, changeGroupChatAuditPageSize, clearGroupChatAuditFilters, getGroupChatAuditActionLabel, getGroupChatAuditKnownDetails, getGroupChatAuditTotalPages, GROUP_CHAT_AUDIT_ACTION_OPTIONS, hasNonDefaultGroupChatAuditFilters, isValidGroupChatUuid, resolveGroupChatAuditMemberName } from "./group-chat-models";
import type { GroupChatAuditEntry, GroupChatMember } from "./group-chat/group-chat.types";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100, 200] as const;

type Props = { initialGroupId?: string; onBack?: () => void };

function formatAuditDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof GroupChatApiError && error.status === 403) return "You do not have permission to view this Group Audit Trail.";
  if (error instanceof GroupChatApiError && error.status === 404) return "This Group Audit Trail is unavailable for the selected Group.";
  if (error instanceof Error) return error.message;
  return "Unable to load the Group Audit Trail.";
}

function isForbidden(error: unknown): boolean {
  return error instanceof GroupChatApiError && error.status === 403;
}

async function listAllAuditMembers(groupId: string, signal: AbortSignal): Promise<GroupChatMember[]> {
  const members: GroupChatMember[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const response = await listGroupChatMembers(groupId, { page, pageSize: 100, signal });
    members.push(...response.items);
    totalPages = response.pagination.total_pages;
    page += 1;
  }
  return members;
}

function formatKnownDetailValue(value: string, members: readonly GroupChatMember[]): string {
  return resolveGroupChatAuditMemberName(value, members) ?? value;
}

function AuditEvent({ entry, members, currentUserId, currentUserName }: { entry: GroupChatAuditEntry; members: readonly GroupChatMember[]; currentUserId: string; currentUserName: string }) {
  const actorName = entry.actor_id === currentUserId ? `${currentUserName || "You"} (You)` : resolveGroupChatAuditMemberName(entry.actor_id, members);
  const targetName = resolveGroupChatAuditMemberName(entry.target_user_id, members);
  const knownDetails = getGroupChatAuditKnownDetails(entry).map((detail) => ({ ...detail, value: formatKnownDetailValue(detail.value, members) }));
  return <article className="rounded-xl border border-[#e1ebe6] bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-[#16332b]">{getGroupChatAuditActionLabel(entry.action)}</h3>
        <p className="mt-1 text-xs text-[#52736a]">{formatAuditDate(entry.created_at)}</p>
      </div>
      {entry.actor_role ? <span className="rounded-full bg-[#f4faf7] px-2.5 py-1 text-xs font-semibold text-[#52736a]">{entry.actor_role}</span> : null}
    </div>
    <dl className="mt-3 grid gap-2 text-xs text-[#16332b] sm:grid-cols-2">
      <div><dt className="font-semibold text-[#52736a]">Actor</dt><dd>{actorName ?? (entry.actor_id ? "Actor name unavailable" : "System or unrecorded actor")}</dd></div>
      {entry.target_user_id ? <div><dt className="font-semibold text-[#52736a]">Affected member</dt><dd>{targetName ?? "Member name unavailable"}</dd></div> : null}
      {entry.reason ? <div className="sm:col-span-2"><dt className="font-semibold text-[#52736a]">Recorded reason</dt><dd className="mt-1 whitespace-pre-wrap">{entry.reason}</dd></div> : null}
      {knownDetails.length > 0 ? <div className="sm:col-span-2"><dt className="font-semibold text-[#52736a]">Additional details</dt><dd className="mt-1 grid gap-1 sm:grid-cols-2">{knownDetails.map((detail) => <span key={detail.label}><span className="font-semibold">{detail.label}:</span> {detail.value}</span>)}</dd></div> : null}
      {entry.actor_id || entry.target_user_id || entry.message_id ? <div className="sm:col-span-2"><details><summary className="cursor-pointer font-semibold text-[#52736a]">Technical references</summary><dl className="mt-2 grid gap-1 text-[#52736a] sm:grid-cols-3">{entry.actor_id ? <div><dt>Actor ID</dt><dd className="break-all">{entry.actor_id}</dd></div> : null}{entry.target_user_id ? <div><dt>Target ID</dt><dd className="break-all">{entry.target_user_id}</dd></div> : null}{entry.message_id ? <div><dt>Message ID</dt><dd className="break-all">{entry.message_id}</dd></div> : null}</dl></details></div> : null}
    </dl>
  </article>;
}

/** Renders the authenticated, read-only Group Audit Trail without retrieving message content. */
export default function EnterpriseGroupAuditTrailScreen({ initialGroupId, onBack }: Props) {
  const { roles, user } = useAuth();
  const userScope = user?.userId ?? user?.id ?? "";
  const accessScope = [userScope, roles?.tenantSlug ?? "", roles?.tenantRole ?? "", ...(roles?.tenantRbacRoles ?? [])].join("|");
  const ownerEntry = Boolean(initialGroupId?.trim());
  const canAccessCompliance = canAccessGroupChatComplianceReports(roles);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId?.trim() ?? "");
  const [action, setAction] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setSelectedGroupId(initialGroupId?.trim() ?? "");
    setAction("");
    setTargetUserId("");
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  }, [accessScope, initialGroupId]);

  const groupsQuery = useQuery({
    queryKey: ["group-chat", "compliance-groups", accessScope],
    queryFn: ({ signal }) => listGroupChatComplianceGroups(signal),
    enabled: Boolean(userScope) && !ownerEntry && canAccessCompliance,
    retry: false,
    staleTime: 15000,
  });
  const detailsQuery = useQuery({
    queryKey: ["group-chat", "group", selectedGroupId, accessScope],
    queryFn: ({ signal }) => getGroupChat(selectedGroupId, signal),
    enabled: Boolean(userScope) && isValidGroupChatUuid(selectedGroupId),
    retry: false,
    staleTime: 15000,
  });
  const memberRosterQuery = useQuery({
    queryKey: ["group-chat", "audit-members", selectedGroupId, accessScope],
    queryFn: ({ signal }) => listAllAuditMembers(selectedGroupId, signal),
    enabled: Boolean(userScope) && isValidGroupChatUuid(selectedGroupId) && detailsQuery.data?.permissions.can_view_members === true,
    retry: false,
    staleTime: 15000,
  });
  const normalizedTargetUserId = targetUserId.trim();
  const auditEnabled = Boolean(userScope) && isValidGroupChatUuid(selectedGroupId) && detailsQuery.data !== undefined && canViewGroupChatAudit(detailsQuery.data.permissions) && (ownerEntry || canAccessCompliance);
  const auditQuery = useQuery({
    queryKey: ["group-chat", "audit", selectedGroupId, accessScope, action.trim(), normalizedTargetUserId, page, pageSize],
    queryFn: ({ signal }) => listGroupChatAudit(selectedGroupId, { action, targetUserId: normalizedTargetUserId || undefined, page, pageSize, signal }),
    enabled: auditEnabled,
    retry: false,
    staleTime: 15000,
  });
  const auditMembers = memberRosterQuery.data ?? [];
  const affectedMemberOptions = auditMembers.filter((member) => member.membership_status.trim().toLowerCase() === "active" && isValidGroupChatUuid(member.user_id ?? ""));
  const currentUserName = user?.fullName?.trim() ?? "";
  const selectedGroup = groupsQuery.data?.items.find((group) => group.id === selectedGroupId) ?? null;
  const totalPages = getGroupChatAuditTotalPages(auditQuery.data?.total ?? 0, pageSize);
  const auditFilterState = { groupId: selectedGroupId, action, targetUserId, page, pageSize };
  const clearFiltersDisabled = !hasNonDefaultGroupChatAuditFilters(auditFilterState);
  const clearFilters = () => {
    const cleared = clearGroupChatAuditFilters(auditFilterState);
    setSelectedGroupId(cleared.groupId);
    setAction(cleared.action);
    setTargetUserId(cleared.targetUserId);
    setPage(cleared.page);
    setPageSize(cleared.pageSize);
  };
  const changePageSize = (nextPageSize: number) => {
    const changed = changeGroupChatAuditPageSize(auditFilterState, nextPageSize);
    setPage(changed.page);
    setPageSize(changed.pageSize);
  };

  if (!ownerEntry && !canAccessCompliance) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><h1 className="text-xl font-bold text-[#06201c]">Group Audit Trail</h1><p className="mt-2 text-sm text-[#52736a]">Group Audit Trail access is available only when the backend authorizes the selected Group.</p></section>;
  if (!ownerEntry && groupsQuery.isPending) return <p className="rounded-xl bg-[#f9fcfa] p-5 text-sm text-[#52736a]" aria-live="polite">Loading Compliance Groups...</p>;
  if (!ownerEntry && groupsQuery.isError) return <AuditError error={groupsQuery.error} onRetry={() => void groupsQuery.refetch()} />;

  const detailsError = detailsQuery.error;
  const auditError = auditQuery.error;
  return <section className="space-y-4">
    <header><div className="flex flex-wrap items-center justify-between gap-3">{onBack ? <button type="button" onClick={onBack} className="text-sm font-semibold text-[#1f6a58] hover:underline">← Back</button> : null}<div className={onBack ? "text-right" : ""}><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Compliance</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Group Audit Trail</h1></div></div><p className="mt-1 text-sm text-[#52736a]">Review recorded Group events without opening private message history.</p></header>
    {!ownerEntry ? <label className="block text-sm font-semibold text-[#16332b]">Group<select value={selectedGroupId} onChange={(event) => { setSelectedGroupId(event.target.value); setAction(""); setTargetUserId(""); setPage(1); }} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">Select a Group</option>{groupsQuery.data?.items.map((group) => <option key={group.id} value={group.id}>{group.name.trim() || "Untitled Group"}</option>)}</select></label> : null}
    {!ownerEntry && groupsQuery.data?.items.length === 0 ? <p className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">No authorized Compliance Groups are available.</p> : null}
    {selectedGroupId && detailsQuery.isPending ? <p className="text-sm text-[#52736a]" aria-live="polite">Loading Group permissions...</p> : null}
    {selectedGroupId && detailsQuery.isError ? isForbidden(detailsError) ? <AuditForbidden /> : <AuditError error={detailsError} onRetry={() => void detailsQuery.refetch()} /> : null}
    {selectedGroupId && detailsQuery.data && !canViewGroupChatAudit(detailsQuery.data.permissions) ? <section className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-5"><h2 className="text-base font-bold text-[#16332b]">Audit Trail unavailable</h2><p className="mt-2 text-sm text-[#52736a]">The backend has not authorized audit access for this Group.</p></section> : null}
    {selectedGroupId && detailsQuery.data && canViewGroupChatAudit(detailsQuery.data.permissions) ? <>
      <section className="grid gap-3 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.45fr)_minmax(9rem,0.5fr)]">
        <label className="text-sm font-semibold text-[#16332b]">Action filter<select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">All Actions</option>{GROUP_CHAT_AUDIT_ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-sm font-semibold text-[#16332b]">Affected member<select value={targetUserId} onChange={(event) => { setTargetUserId(event.target.value); setPage(1); }} disabled={memberRosterQuery.isPending || memberRosterQuery.isError || detailsQuery.data.permissions.can_view_members !== true} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">All affected members</option>{affectedMemberOptions.map((member) => <option key={member.user_id!} value={member.user_id!}>{member.name.trim() || "Member name unavailable"}</option>)}</select>{memberRosterQuery.isPending ? <span className="mt-1 block text-xs font-normal text-[#52736a]">Loading authorized members...</span> : memberRosterQuery.isError ? <span className="mt-1 block text-xs font-normal text-[#7a271a]">Affected member filtering is unavailable because the authorized member roster could not be loaded.</span> : detailsQuery.data.permissions.can_view_members !== true ? <span className="mt-1 block text-xs font-normal text-[#52736a]">Affected member filtering is unavailable for your current permissions.</span> : affectedMemberOptions.length === 0 ? <span className="mt-1 block text-xs font-normal text-[#52736a]">No authorized active members are available for this filter.</span> : null}</label>
        <label className="text-sm font-semibold text-[#16332b]">Page size<select value={pageSize} onChange={(event) => changePageSize(Number(event.target.value))} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal">{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <button type="button" disabled={clearFiltersDisabled} onClick={clearFilters} className="self-end rounded-xl border border-[#1f6a58] px-3 py-2 text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-40">Clear Filters</button>
      </section>
      {auditQuery.isPending ? <p className="text-sm text-[#52736a]" aria-live="polite">Loading audit events...</p> : auditQuery.isError ? isForbidden(auditError) ? <AuditForbidden /> : <AuditError error={auditError} onRetry={() => void auditQuery.refetch()} /> : auditQuery.data?.items.length === 0 ? <p className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">No audit events match these filters.</p> : <><div className="flex items-center justify-between text-sm text-[#52736a]"><span>{auditQuery.data?.total ?? 0} total events{selectedGroup ? ` · ${selectedGroup.name}` : ""}</span><span>Page {page} of {totalPages}</span></div><div className="space-y-3">{auditQuery.data?.items.map((entry) => <AuditEvent key={entry.id} entry={entry} members={auditMembers} currentUserId={userScope} currentUserName={currentUserName} />)}</div><nav aria-label="Group Audit Trail pagination" className="flex justify-between gap-2"><button type="button" disabled={page <= 1 || auditQuery.isFetching} onClick={() => setPage((current) => current - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages || auditQuery.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[#1f6a58] px-3 py-1.5 text-sm font-semibold text-[#1f6a58] disabled:opacity-40">Next</button></nav></>}
    </> : null}
  </section>;
}

function AuditForbidden() {
  return <section className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-5" role="alert"><h2 className="text-base font-bold text-[#7a271a]">Audit Trail access denied</h2><p className="mt-2 text-sm text-[#7a271a]">The backend denied access to this Group Audit Trail.</p></section>;
}

function AuditError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <section className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm text-[#7a271a]">{getErrorMessage(error)}</p><button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></section>;
}
