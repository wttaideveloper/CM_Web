"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@ihp/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GroupChatApiError, getGroupChat, listGroupChatComplianceGroups, listGroupChatMembers, reassignGroupChatOwner } from "./group-chat/group-chat.service";
import { canAccessGroupChatComplianceReports, getGroupChatOwnerReassignmentRefreshKeys, isEligibleGroupChatOwnerReassignmentCandidate, resolveGroupChatOwnerDisplay, type GroupChatOwnerResolution } from "./group-chat-models";
import type { GroupChatDetails, GroupChatMember, GroupChatSummary } from "./group-chat/group-chat.types";

async function listAllComplianceGroupMembers(groupId: string, signal: AbortSignal): Promise<GroupChatMember[]> {
  const members: GroupChatMember[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await listGroupChatMembers(groupId, { page, pageSize: 50, signal });
    members.push(...response.items);
    totalPages = response.pagination.total_pages;
    page += 1;
  } while (page <= totalPages);
  return members;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof GroupChatApiError && error.status === 403) return "You do not have permission to reassign Group Owners.";
  if (error instanceof Error) return error.message;
  return "Unable to load the owner-reassignment data.";
}

function groupLabel(group: GroupChatSummary): string {
  return group.name.trim() || "Untitled Group";
}

/** Renders the isolated Compliance owner-reassignment workflow. */
export default function EnterpriseGroupOwnerReassignmentScreen() {
  const { roles, user } = useAuth();
  const userScope = user?.userId ?? user?.id ?? "";
  const accessScope = [userScope, roles?.tenantSlug ?? "", roles?.tenantRole ?? "", ...(roles?.tenantRbacRoles ?? [])].join("|");
  const canAccess = canAccessGroupChatComplianceReports(roles);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const [selectionScope, setSelectionScope] = useState(accessScope);
  const selectionIsCurrent = selectionScope === accessScope;
  const scopedSelectedGroupId = selectionIsCurrent ? selectedGroupId : "";
  const scopedSelectedUserId = selectionIsCurrent ? selectedUserId : "";
  const scopedReason = selectionIsCurrent ? reason : "";
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({ queryKey: ["group-chat", "compliance-groups", accessScope], queryFn: ({ signal }) => listGroupChatComplianceGroups(signal), enabled: canAccess && Boolean(userScope), retry: false, staleTime: 15000 });
  const detailsQuery = useQuery({ queryKey: ["group-chat", "group", scopedSelectedGroupId, accessScope], queryFn: ({ signal }) => getGroupChat(scopedSelectedGroupId, signal), enabled: canAccess && Boolean(scopedSelectedGroupId), retry: false, staleTime: 15000 });
  const membersQuery = useQuery({ queryKey: ["group-chat", "compliance-owner-members", scopedSelectedGroupId, accessScope], queryFn: ({ signal }) => listAllComplianceGroupMembers(scopedSelectedGroupId, signal), enabled: canAccess && Boolean(scopedSelectedGroupId) && detailsQuery.data?.permissions.can_reassign_owner === true, retry: false, staleTime: 15000 });
  const ownerResolution = useMemo(() => resolveGroupChatOwnerDisplay({ members: membersQuery.data ?? [], authoritativeOwner: detailsQuery.data?.owner ?? null, ownerUserId: detailsQuery.data?.owner_user_id ?? null, ownerName: detailsQuery.data?.owner_name ?? null, currentUserId: userScope }), [detailsQuery.data, membersQuery.data, userScope]);
  const ownerUserId = ownerResolution.state === "resolved" ? ownerResolution.userId : null;
  const candidates = useMemo(() => (membersQuery.data ?? []).filter((member) => member.user_id !== ownerUserId).filter(isEligibleGroupChatOwnerReassignmentCandidate), [membersQuery.data, ownerUserId]);
  const selectedCandidate = candidates.find((member) => member.user_id === scopedSelectedUserId) ?? null;
  const normalizedReason = scopedReason.trim();
  const reasonValid = normalizedReason.length >= 3 && normalizedReason.length <= 255;
  const mutation = useMutation({
    mutationFn: () => reassignGroupChatOwner(scopedSelectedGroupId, scopedSelectedUserId, normalizedReason),
    retry: false,
    onSuccess: async () => {
      setConfirming(false);
      setSelectedUserId("");
      setReason("");
      await Promise.all(getGroupChatOwnerReassignmentRefreshKeys(scopedSelectedGroupId, accessScope).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      setFeedback({ message: "Group Owner reassignment completed successfully.", error: false });
    },
    onError: (error: unknown) => {
      setConfirming(false);
      setFeedback({ message: getErrorMessage(error), error: true });
    },
  });

  if (!canAccess) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><h1 className="text-xl font-bold text-[#06201c]">Owner Reassignment</h1><p className="mt-2 text-sm text-[#52736a]">Owner reassignment is available only to authorized Compliance administrators.</p></section>;
  if (groupsQuery.isPending) return <p className="rounded-xl bg-[#f9fcfa] p-5 text-sm text-[#52736a]" aria-live="polite">Loading Compliance Groups...</p>;
  if (groupsQuery.isError) return <section className="space-y-4"><Header /><ErrorPanel error={groupsQuery.error} onRetry={() => void groupsQuery.refetch()} /></section>;
  const groups = groupsQuery.data?.items ?? [];
  const details = detailsQuery.data ?? null;
  const permissionDenied = details?.permissions.can_reassign_owner !== true;
  return <section className="space-y-4"><Header /><section className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4"><p className="text-sm text-[#52736a]">Select an authorized Training Group, then choose a backend-eligible replacement owner. Compliance reassignment is separate from ordinary member ownership transfer.</p><label className="mt-4 block text-sm font-semibold text-[#16332b]">Group<select value={scopedSelectedGroupId} onChange={(event) => { setSelectionScope(accessScope); setSelectedGroupId(event.target.value); setSelectedUserId(""); setReason(""); setConfirming(false); setFeedback(null); }} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">Select a Group</option>{groups.map((group) => <option key={group.id} value={group.id}>{groupLabel(group)}</option>)}</select></label>{groups.length === 0 ? <p className="mt-3 text-sm text-[#52736a]">No authorized Compliance Groups are available.</p> : null}</section>{scopedSelectedGroupId && detailsQuery.isPending ? <p className="text-sm text-[#52736a]" aria-live="polite">Loading Group details...</p> : null}{scopedSelectedGroupId && detailsQuery.isError ? <ErrorPanel error={detailsQuery.error} onRetry={() => void detailsQuery.refetch()} /> : null}{details ? <OwnerForm details={details} permissionDenied={permissionDenied} ownerResolution={ownerResolution} membersQuery={membersQuery} candidates={candidates} selectedUserId={scopedSelectedUserId} setSelectedUserId={setSelectedUserId} reason={scopedReason} setReason={setReason} reasonValid={reasonValid} confirming={confirming} setConfirming={setConfirming} selectedCandidate={selectedCandidate} mutation={mutation} feedback={feedback} /> : null}</section>;
}

function Header() {
  return <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Compliance</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Owner Reassignment</h1><p className="mt-1 text-sm text-[#52736a]">Reassign a Training Group owner without opening private message history.</p></div>;
}

function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm text-[#7a271a]">{getErrorMessage(error)}</p><button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></div>;
}

function OwnerForm({ details, permissionDenied, ownerResolution, membersQuery, candidates, selectedUserId, setSelectedUserId, reason, setReason, reasonValid, confirming, setConfirming, selectedCandidate, mutation, feedback }: { details: GroupChatDetails; permissionDenied: boolean; ownerResolution: GroupChatOwnerResolution; membersQuery: ReturnType<typeof useQuery<GroupChatMember[]>>; candidates: GroupChatMember[]; selectedUserId: string; setSelectedUserId: (value: string) => void; reason: string; setReason: (value: string) => void; reasonValid: boolean; confirming: boolean; setConfirming: (value: boolean) => void; selectedCandidate: GroupChatMember | null; mutation: { isPending: boolean; mutate: () => void }; feedback: { message: string; error: boolean } | null }) {
  const ownerLabel = ownerResolution.state === "resolved" ? ownerResolution.label : membersQuery.isPending ? "Loading Group Owner..." : membersQuery.isError ? membersQuery.error instanceof GroupChatApiError && membersQuery.error.code === "malformed_member_response" ? "Group Owner unavailable (member data was malformed)." : "Group Owner unavailable (members could not be loaded)." : "Group Owner unavailable.";
  const ownerName = (groupDetails: GroupChatDetails): string => ownerLabel || groupDetails.name;
  const ownerUserId = ownerResolution.state === "resolved" ? ownerResolution.userId : null;
  const activeReplacementMembers = (membersQuery.data ?? []).filter((member) => member.membership_status.trim().toLowerCase() === "active" && member.user_id !== ownerUserId && member.role.trim().toLowerCase() !== "owner");
  const emptyCandidateMessage = activeReplacementMembers.length === 0 ? "No active replacement members are available. A verified Provider must first be invited and accept the invitation before becoming a replacement-owner candidate." : "Members exist, but none is backend-eligible for owner reassignment.";
  if (permissionDenied) return <section className="rounded-xl border border-[#d7e5df] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">{details.name}</h2><p className="mt-1 text-sm text-[#52736a]">Current owner: {ownerLabel}</p><p className="mt-4 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]">The backend has not authorized owner reassignment for this Group.</p></section>;
  if (membersQuery.isPending) return <section className="rounded-xl border border-[#d7e5df] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">{details.name}</h2><p className="mt-1 text-sm text-[#52736a]">Current owner: {ownerLabel}</p><p className="mt-4 text-sm text-[#52736a]" aria-live="polite">Loading eligible replacement owners...</p></section>;
  if (membersQuery.isError) return <section className="rounded-xl border border-[#d7e5df] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">{details.name}</h2><p className="mt-1 text-sm text-[#52736a]">Current owner: {ownerLabel}</p><div className="mt-4"><ErrorPanel error={membersQuery.error} onRetry={() => void membersQuery.refetch()} /></div></section>;
  if (candidates.length === 0) return <section className="rounded-xl border border-[#d7e5df] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">{details.name}</h2><p className="mt-1 text-sm text-[#52736a]">Current owner: {ownerLabel}</p><p className="mt-4 text-sm text-[#52736a]">{emptyCandidateMessage}</p></section>;
  return <section className="rounded-xl border border-[#d7e5df] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">{details.name}</h2><p className="mt-1 text-sm text-[#52736a]">Current owner: {ownerName(details)}</p><form onSubmit={(event) => { event.preventDefault(); if (selectedCandidate && reasonValid && !mutation.isPending) setConfirming(true); }} className="mt-4 space-y-3"><label className="block text-sm font-semibold text-[#16332b]">Replacement owner<select value={selectedUserId} onChange={(event) => { setSelectedUserId(event.target.value); setConfirming(false); }} disabled={mutation.isPending} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">Select an eligible Provider</option>{candidates.map((member) => <option key={member.user_id} value={member.user_id ?? ""}>{member.name}</option>)}</select></label>{candidates.length === 0 ? <p className="text-sm text-[#52736a]">No replacement member has the backend eligibility required for reassignment.</p> : null}<label className="block text-sm font-semibold text-[#16332b]">Reason <span className="font-normal text-[#52736a]">(3–255 characters)</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setConfirming(false); }} disabled={mutation.isPending} rows={3} maxLength={255} className="mt-1 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2 font-normal" /></label>{reason.length > 0 && !reasonValid ? <p className="text-xs text-[#b42318]" role="alert">Reason must be between 3 and 255 characters after trimming.</p> : null}{confirming ? <div className="rounded-lg border border-[#d7e5df] bg-[#f9fcfa] p-3"><p className="text-sm text-[#16332b]">Confirm assigning Group Owner responsibility to {selectedCandidate?.name ?? "the selected member"}?</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{mutation.isPending ? "Reassigning..." : "Confirm reassignment"}</button><button type="button" onClick={() => setConfirming(false)} disabled={mutation.isPending} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button></div></div> : <button type="submit" disabled={!selectedCandidate || !reasonValid || mutation.isPending} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Review reassignment</button>}{feedback ? <p className={`rounded-lg border p-3 text-sm ${feedback.error ? "border-[#f3d5d1] bg-[#fff7f6] text-[#7a271a]" : "border-[#c7e8d4] bg-[#e8f6ee] text-[#1f6a58]"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}</form></section>;
}
