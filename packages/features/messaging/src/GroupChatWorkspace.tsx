"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeGroupMemberRole, closeGroupChat, getGroupChat, inviteEnrolledLearners, inviteGroupMembers, listGroupChatLearners, listGroupChatMembers, listGroupChatProviders, muteGroupMemberPosting, removeGroupMember, reopenGroupChat, transferGroupOwnership, unmuteGroupMemberPosting, updateGroupDetails, updateGroupSettings, uploadGroupAvatar } from "./group-chat/group-chat.service";
import { buildReopenGroupPayload, canCloseGroupChat, canEditGroupChat, canReopenGroupChat, canUpdateGroupChatSettings, formatGroupChatInvitationFeedback, getGroupChatMemberOwnershipAction, getGroupChatMemberPostingAction, getGroupChatMemberRemovalAction, getGroupChatMemberRoleActions, getGroupChatReopenReasonError, isGroupChatProviderUnavailableInCurrentGroup, isSupportedGroupAvatarFile, splitGroupChatMembers, type GroupChatMemberAction, type GroupChatMemberRoleAction } from "./group-chat-models";
import type { GroupChatDetails, GroupChatLearner, GroupChatMember, GroupChatPermissions, GroupChatProvider } from "./group-chat/group-chat.types";
import { GroupAvatarDisplay, GroupAvatarPicker, useGroupAvatarPreview } from "./GroupChatAvatar";
import GroupChatMessages from "./GroupChatMessages";

type Props = { groupId: string; onClose?: () => void };
const groupKey = (groupId: string) => ["group-chat", "group", groupId];
const memberKey = (groupId: string, search: string) => ["group-chat", "members", groupId, search];
const inviteMemberKey = (groupId: string) => ["group-chat", "invite-members", groupId];
const groupsKey = ["group-chat", "groups"];

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Try again</button></div>;
}

async function listAllGroupChatMembers(groupId: string, signal: AbortSignal): Promise<GroupChatMember[]> {
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

function LegacyMemberRow({ member, actions, menuOpen, pendingAction, reason, disabled, onToggleMenu, onSelectAction, onReasonChange, onConfirm, onCancel }: { member: GroupChatMember; actions: readonly GroupChatMemberAction[]; menuOpen: boolean; pendingAction: GroupChatMemberAction | null; reason: string; disabled: boolean; onToggleMenu: () => void; onSelectAction: (action: GroupChatMemberAction) => void; onReasonChange: (reason: string) => void; onConfirm: () => void; onCancel: () => void }) {
  const actionNeedsReason = pendingAction === "remove-admin" || pendingAction === "remove-member" || pendingAction === "cancel-invitation";
  const reasonRequired = pendingAction === "remove-admin";
  const prompt = pendingAction === "make-admin" ? "Make this Provider a Group Admin?" : pendingAction === "remove-admin" ? "Remove this Admin role?" : pendingAction === "remove-member" ? `Remove ${member.name} from this Group Chat?` : pendingAction === "cancel-invitation" ? `Cancel ${member.name}'s invitation?` : pendingAction === "mute-posting" ? `Mute posting for ${member.name}?` : pendingAction === "unmute-posting" ? `Unmute posting for ${member.name}?` : `Transfer Group ownership to ${member.name}?`;
  const explanation = pendingAction === "remove-member" ? "Removing this member ends their access to the group." : pendingAction === "cancel-invitation" ? "The pending invitation will no longer grant access to the group." : pendingAction === "mute-posting" ? "This member can continue reading group messages but cannot send new messages while muted." : pendingAction === "unmute-posting" ? "This member will be able to send new messages again." : pendingAction === "transfer-ownership" ? "The selected Provider will become Group Owner. You will lose ownership privileges, and the backend will assign your new role based on available Admin positions." : null;
  return <div className="relative flex items-center gap-3 rounded-xl border border-[#e1ebe6] p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]">{initials(member.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#16332b]">{member.name}</span><span className="mt-0.5 block text-xs capitalize text-[#52736a]">{member.member_kind || "Member"} · {member.membership_status}</span></span><span className="shrink-0 rounded-full bg-[#f4faf7] px-2 py-1 text-[11px] font-semibold text-[#52736a]">{member.role}</span>{actions.length > 0 ? <div className="relative shrink-0"><button type="button" aria-label={`Actions for ${member.name}`} aria-expanded={menuOpen} aria-haspopup="menu" disabled={disabled} onClick={onToggleMenu} className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-[#52736a] hover:bg-[#e8f6ee] disabled:opacity-50">⋯</button>{menuOpen ? <div role="menu" className="absolute right-0 top-9 z-20 w-72 rounded-xl border border-[#d7e5df] bg-white p-3 text-sm shadow-lg">{pendingAction ? <div><p className="font-semibold text-[#16332b]">{prompt}</p>{explanation ? <p className="mt-1 text-xs text-[#52736a]">{explanation}</p> : null}{actionNeedsReason ? <label className="mt-2 block text-xs font-semibold text-[#52736a]">Reason {reasonRequired ? "(required)" : "(optional)"}<input value={reason} onChange={(event) => onReasonChange(event.target.value)} disabled={disabled} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-2 text-sm font-normal" /></label> : null}<div className="mt-3 flex gap-2"><button type="button" disabled={disabled || (reasonRequired && !reason.trim())} onClick={onConfirm} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{disabled ? "Saving..." : "Confirm"}</button><button type="button" disabled={disabled} onClick={onCancel} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button></div></div> : actions.map((action) => <button key={action} type="button" role="menuitem" onClick={() => onSelectAction(action)} className="block w-full rounded-lg px-3 py-2 text-left text-[#16332b] hover:bg-[#e8f6ee]">{action === "make-admin" ? "Make Group Admin" : action === "remove-admin" ? "Remove Admin Role" : action === "remove-member" ? "Remove from Group" : action === "cancel-invitation" ? "Cancel Invitation" : action === "transfer-ownership" ? "Transfer Ownership" : action === "mute-posting" ? "Mute Posting" : "Unmute Posting"}</button>)}</div> : null}</div> : null}</div>;
}

function MemberRow({ member, actions, menuOpen, pendingAction, reason, disabled, onToggleMenu, onSelectAction, onReasonChange, onConfirm, onCancel }: { member: GroupChatMember; actions: readonly GroupChatMemberAction[]; menuOpen: boolean; pendingAction: GroupChatMemberAction | null; reason: string; disabled: boolean; onToggleMenu: () => void; onSelectAction: (action: GroupChatMemberAction) => void; onReasonChange: (reason: string) => void; onConfirm: () => void; onCancel: () => void }) {
  if (actions.length === 0 && member.posting_muted !== true) {
    return <LegacyMemberRow member={member} actions={actions} menuOpen={menuOpen} pendingAction={pendingAction} reason={reason} disabled={disabled} onToggleMenu={onToggleMenu} onSelectAction={onSelectAction} onReasonChange={onReasonChange} onConfirm={onConfirm} onCancel={onCancel} />;
  }

  const actionNeedsReason = pendingAction === "remove-admin" || pendingAction === "remove-member" || pendingAction === "cancel-invitation";
  const reasonRequired = pendingAction === "remove-admin";
  const actionLabel = (action: GroupChatMemberAction): string => action === "make-admin" ? "Make Group Admin" : action === "remove-admin" ? "Remove Admin Role" : action === "remove-member" ? "Remove from Group" : action === "cancel-invitation" ? "Cancel Invitation" : action === "transfer-ownership" ? "Transfer Ownership" : action === "mute-posting" ? "Mute Posting" : "Unmute Posting";
  const prompt = pendingAction === "make-admin" ? "Make this Provider a Group Admin?" : pendingAction === "remove-admin" ? "Remove this Admin role?" : pendingAction === "remove-member" ? `Remove ${member.name} from this Group Chat?` : pendingAction === "cancel-invitation" ? `Cancel ${member.name}'s invitation?` : pendingAction === "mute-posting" ? `Mute posting for ${member.name}?` : pendingAction === "unmute-posting" ? `Unmute posting for ${member.name}?` : `Transfer Group ownership to ${member.name}?`;
  const explanation = pendingAction === "remove-member" ? "Removing this member ends their access to the group." : pendingAction === "cancel-invitation" ? "The pending invitation will no longer grant access to the group." : pendingAction === "mute-posting" ? "This member can continue reading group messages but cannot send new messages while muted." : pendingAction === "unmute-posting" ? "This member will be able to send new messages again." : pendingAction === "transfer-ownership" ? "The selected Provider will become Group Owner. You will lose ownership privileges, and the backend will assign your new role based on available Admin positions." : null;
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-[#e1ebe6] p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]">{initials(member.name)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#16332b]">{member.name}</span>
        <span className="mt-0.5 block text-xs capitalize text-[#52736a]">{member.member_kind || "Member"} · {member.membership_status}</span>
        {member.posting_muted === true ? <span className="mt-1 inline-block rounded-full bg-[#fff3d6] px-2 py-0.5 text-[11px] font-semibold text-[#8b5e00]">Posting muted</span> : null}
      </span>
      <span className="shrink-0 rounded-full bg-[#f4faf7] px-2 py-1 text-[11px] font-semibold text-[#52736a]">{member.role}</span>
      {actions.length > 0 ? <div className="relative shrink-0">
        <button type="button" aria-label={`Actions for ${member.name}`} aria-expanded={menuOpen} aria-haspopup="menu" disabled={disabled} onClick={onToggleMenu} className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tracking-widest text-[#52736a] hover:bg-[#e8f6ee] disabled:opacity-50">...</button>
        {menuOpen ? <div role="menu" className="absolute right-0 top-9 z-20 w-72 rounded-xl border border-[#d7e5df] bg-white p-3 text-sm shadow-lg">
          {pendingAction ? <div>
            <p className="font-semibold text-[#16332b]">{prompt}</p>
            {explanation ? <p className="mt-1 text-xs text-[#52736a]">{explanation}</p> : null}
            {actionNeedsReason ? <label className="mt-2 block text-xs font-semibold text-[#52736a]">Reason {reasonRequired ? "(required)" : "(optional)"}<input value={reason} onChange={(event) => onReasonChange(event.target.value)} disabled={disabled} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-2 text-sm font-normal" /></label> : null}
            <div className="mt-3 flex gap-2"><button type="button" disabled={disabled || (reasonRequired && !reason.trim())} onClick={onConfirm} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{disabled ? "Saving..." : "Confirm"}</button><button type="button" disabled={disabled} onClick={onCancel} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button></div>
          </div> : actions.map((action) => <button key={action} type="button" role="menuitem" onClick={() => onSelectAction(action)} className="block w-full rounded-lg px-3 py-2 text-left text-[#16332b] hover:bg-[#e8f6ee]">{actionLabel(action)}</button>)}
        </div> : null}
      </div> : null}
    </div>
  );
}

function GroupDetailsOverview({ group }: { group: GroupChatDetails }) {
  const groupIsClosed = group.status?.trim().toLowerCase() === "closed";
  return <div className="space-y-3">
    {groupIsClosed ? <div className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-3 text-sm text-[#8b5e00]" role="status">This group is closed. It is read-only.</div> : null}
    <section className="rounded-xl border border-[#e1ebe6] p-3">
      <h4 className="text-sm font-bold text-[#16332b]">Group overview</h4>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Status</dt><dd className="mt-1 text-[#16332b]">{groupIsClosed ? "Closed" : group.status || "Active"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Posting</dt><dd className="mt-1 text-[#16332b]">{groupIsClosed ? "Read-only" : group.permissions.can_post === true ? group.admins_only_posting === true ? "Providers and admins only" : "All members" : "Posting unavailable"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Member count</dt><dd className="mt-1 text-[#16332b]">{group.member_count ?? "Unavailable"}</dd></div>
        {group.owner || group.owner_name ? <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Owner</dt><dd className="mt-1 text-[#16332b]">{group.owner?.name || group.owner_name}</dd></div> : null}
      </dl>
    </section>
    {group.visibility_notice ? <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3 text-xs text-[#52736a]">{group.visibility_notice}</p> : null}
    {group.emergency_notice ? <p className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-3 text-xs text-[#8b5e00]">{group.emergency_notice}</p> : null}
  </div>;
}
type GroupDetailsTab = "overview" | "members" | "invite" | "settings";
function GroupDetailsPanel({ group, groupId, canViewMembers, canInviteMembers, onClose }: { group: GroupChatDetails; groupId: string; canViewMembers: boolean; canInviteMembers: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<GroupDetailsTab>("overview");
  const groupIsClosed = group.status?.trim().toLowerCase() === "closed";
  return <section className="flex min-h-0 h-full flex-col bg-white" aria-label="Group details">
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e1ebe6] px-3 py-2.5 sm:px-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Group details</p>
        <h3 className="truncate text-base font-bold text-[#16332b]">{group.name}</h3>
      </div>
      <button type="button" onClick={onClose} className="shrink-0 rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7]" aria-label="Back to conversation">Back to conversation</button>
    </div>
    <div className="flex shrink-0 gap-3 border-b border-[#e1ebe6] px-3 py-3 sm:px-4">
      <GroupAvatarDisplay name={group.name} url={group.avatar_url} size="medium" />
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-base font-bold text-[#16332b]">{group.name}</h4>
        <p className="mt-0.5 text-xs text-[#52736a]">{group.member_count ?? "—"} members · {group.training_title || group.context_name || "Training context"}</p>
        <p className="mt-2 line-clamp-2 text-sm text-[#52736a]">{group.description || "No description provided."}</p>
        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${groupIsClosed ? "bg-[#fff3d6] text-[#8b5e00]" : "bg-[#e8f6ee] text-[#1f6a58]"}`}>{groupIsClosed ? "Closed" : group.status || "Active"}</span>
      </div>
    </div>
    <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-[#e1ebe6] px-3 py-2 sm:px-4" role="tablist" aria-label="Group management">
      {([["overview", "Overview"], ["members", "Members"], ["invite", "Invite members"], ["settings", "Settings"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={tab === value ? "rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white" : "rounded-full bg-[#f4faf7] px-3 py-1.5 text-xs font-semibold text-[#52736a]"}>{label}</button>)}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
      {tab === "overview" ? <GroupDetailsOverview group={group} /> : tab === "members" ? <Members groupId={groupId} ownerUserId={group.owner_user_id} groupStatus={group.status} permissions={group.permissions} canViewMembers={canViewMembers} /> : tab === "invite" ? <Invite group={group} groupId={groupId} canInviteMembers={canInviteMembers} /> : <Settings group={group} groupId={groupId} />}
    </div>
  </section>;
}
function Members({ groupId, ownerUserId, groupStatus, permissions, canViewMembers }: { groupId: string; ownerUserId: string | null; groupStatus: string | null; permissions: GroupChatPermissions; canViewMembers: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<{ member: GroupChatMember; action: GroupChatMemberAction } | null>(null);
  const [demotionReason, setDemotionReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const query = useQuery({ queryKey: memberKey(groupId, search), queryFn: ({ signal }) => listGroupChatMembers(groupId, { q: search, pageSize: 50, signal }), enabled: canViewMembers, staleTime: 15000, retry: false });
  const canManageRoles = permissions.can_make_admin === true || permissions.can_remove_admin === true;
  const roleRosterQuery = useQuery({ queryKey: ["group-chat", "member-role-roster", groupId], queryFn: ({ signal }) => listAllGroupChatMembers(groupId, signal), enabled: canViewMembers && canManageRoles, staleTime: 15000, retry: false });
  const refreshMembership = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["group-chat", "group", groupId] }), queryClient.invalidateQueries({ queryKey: ["group-chat", "members", groupId] }), queryClient.invalidateQueries({ queryKey: ["group-chat", "member-role-roster", groupId] }), queryClient.invalidateQueries({ queryKey: ["group-chat", "current-member", groupId] }), queryClient.invalidateQueries({ queryKey: ["group-chat", "groups"] })]); };
  const resetMemberAction = () => { setPendingMemberAction(null); setOpenMemberMenuId(null); setDemotionReason(""); };
  const roleMutation = useMutation({ mutationFn: ({ member, action, reason }: { member: GroupChatMember; action: GroupChatMemberRoleAction; reason: string }) => changeGroupMemberRole(groupId, member.user_id ?? "", action === "make-admin" ? "admin" : "member", reason), retry: false, onSuccess: async () => { resetMemberAction(); setFeedback("Member role updated successfully."); await refreshMembership(); }, onError: (error: Error) => setFeedback(error.message) });
  const ownershipMutation = useMutation({ mutationFn: (member: GroupChatMember) => transferGroupOwnership(groupId, member.user_id ?? ""), retry: false, onSuccess: async () => { resetMemberAction(); setFeedback("Group ownership transferred successfully."); await refreshMembership(); }, onError: (error: Error) => setFeedback(error.message) });
  const removalMutation = useMutation({ mutationFn: ({ member, reason }: { member: GroupChatMember; reason: string }) => removeGroupMember(groupId, member.user_id ?? "", reason), retry: false, onSuccess: async () => { resetMemberAction(); setFeedback("Member access updated successfully."); await refreshMembership(); }, onError: (error: Error) => setFeedback(error.message) });
  const muteMutation = useMutation({ mutationFn: ({ member, action }: { member: GroupChatMember; action: "mute-posting" | "unmute-posting" }) => action === "mute-posting" ? muteGroupMemberPosting(groupId, member.user_id ?? "") : unmuteGroupMemberPosting(groupId, member.user_id ?? ""), retry: false, onSuccess: async (_data, variables) => { resetMemberAction(); setFeedback(variables.action === "mute-posting" ? "Member posting muted successfully." : "Member posting unmuted successfully."); await refreshMembership(); }, onError: (error: Error) => setFeedback(error.message) });
  if (!canViewMembers) return <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Member details are not available for this Group Chat.</p>;
  if (query.isPending) return <p className="text-sm text-[#52736a]">Loading members...</p>;
  if (query.isError) return <Retry message={query.error.message} onRetry={() => void query.refetch()} />;
  const members = query.data?.items ?? [];
  const { active, pending, excluded } = splitGroupChatMembers(members);
  const visiblePending = permissions.can_view_pending_invitations === true ? pending : [];
  const roleRoster = roleRosterQuery.data ?? [];
  const roleActions = (member: GroupChatMember) => getGroupChatMemberRoleActions(member, permissions, roleRoster, ownerUserId);
  const removalAction = (member: GroupChatMember) => getGroupChatMemberRemovalAction(member, permissions, ownerUserId);
  const isMutationPending = roleMutation.isPending || removalMutation.isPending || muteMutation.isPending || ownershipMutation.isPending;
  const confirmMemberAction = () => {
    if (!pendingMemberAction) return;
    if (pendingMemberAction.action === "make-admin" || pendingMemberAction.action === "remove-admin") {
      roleMutation.mutate({ member: pendingMemberAction.member, action: pendingMemberAction.action, reason: demotionReason });
      return;
    }
    if (pendingMemberAction.action === "remove-member" || pendingMemberAction.action === "cancel-invitation") {
      removalMutation.mutate({ member: pendingMemberAction.member, reason: demotionReason });
      return;
    }
    if (pendingMemberAction.action === "transfer-ownership") {
      ownershipMutation.mutate(pendingMemberAction.member);
      return;
    }
    muteMutation.mutate({ member: pendingMemberAction.member, action: pendingMemberAction.action });
  };
  const memberActions = (member: GroupChatMember): readonly GroupChatMemberAction[] => {
    const actions: GroupChatMemberAction[] = [...roleActions(member)];
    const ownershipAction = getGroupChatMemberOwnershipAction(member, permissions, ownerUserId, groupStatus);
    if (ownershipAction) actions.push(ownershipAction);
    const removal = removalAction(member);
    if (removal) actions.push(removal);
    const postingAction = getGroupChatMemberPostingAction(member, permissions, ownerUserId);
    if (postingAction) actions.push(postingAction);
    return actions;
  };
  const mutationError = roleMutation.isError || removalMutation.isError || muteMutation.isError || ownershipMutation.isError;
  return <div className="space-y-4">{feedback ? <p className={`rounded-xl border p-3 text-sm font-semibold ${mutationError ? "border-[#f3d5d1] bg-[#fff7f6] text-[#7a271a]" : "border-[#b7dfc7] bg-[#e8f6ee] text-[#1f6a58]"}`} role={mutationError ? "alert" : "status"}>{feedback}</p> : null}<label className="sr-only" htmlFor="live-group-member-search">Search members</label><input id="live-group-member-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /><section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7f9d94]">Active members ({active.length})</h3><div className="space-y-2">{active.length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No active members match this search.</p> : active.map((member) => <MemberRow key={member.id} member={member} actions={memberActions(member)} menuOpen={openMemberMenuId === member.id} pendingAction={pendingMemberAction?.member.id === member.id ? pendingMemberAction.action : null} reason={demotionReason} disabled={isMutationPending} onToggleMenu={() => { setOpenMemberMenuId((current) => current === member.id ? null : member.id); setPendingMemberAction(null); setDemotionReason(""); setFeedback(null); }} onSelectAction={(action) => { setOpenMemberMenuId(member.id); setPendingMemberAction({ member, action }); setDemotionReason(""); setFeedback(null); }} onReasonChange={setDemotionReason} onConfirm={confirmMemberAction} onCancel={() => { setPendingMemberAction(null); setDemotionReason(""); }} />)}</div></section><section className="border-t border-[#e1ebe6] pt-4"><h3 className="text-xs font-bold uppercase tracking-wide text-[#7f9d94]">Pending invitations ({visiblePending.length})</h3>{visiblePending.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">{permissions.can_view_pending_invitations === true ? "No pending invitations." : "Pending invitations are not available for your permissions."}</p> : <div className="space-y-2">{visiblePending.map((member) => <MemberRow key={member.id} member={member} actions={memberActions(member)} menuOpen={openMemberMenuId === member.id} pendingAction={pendingMemberAction?.member.id === member.id ? pendingMemberAction.action : null} reason={demotionReason} disabled={isMutationPending} onToggleMenu={() => { setOpenMemberMenuId((current) => current === member.id ? null : member.id); setDemotionReason(""); setFeedback(null); }} onSelectAction={(action) => { setOpenMemberMenuId(member.id); setPendingMemberAction({ member, action }); setDemotionReason(""); setFeedback(null); }} onReasonChange={setDemotionReason} onConfirm={confirmMemberAction} onCancel={() => { setPendingMemberAction(null); setDemotionReason(""); }} />)}</div>}</section>{excluded.length > 0 ? <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3 text-xs text-[#52736a]">{excluded.length} member record{excluded.length === 1 ? "" : "s"} hidden because the membership status is not active or pending.</p> : null}</div>;
}

function Invite({ group, groupId, canInviteMembers }: { group: GroupChatDetails; groupId: string; canInviteMembers: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "warning" | "error">("success");
  useEffect(() => { if (!feedback || feedbackTone === "error") return; const timeoutId = window.setTimeout(() => setFeedback(null), 4000); return () => window.clearTimeout(timeoutId); }, [feedback, feedbackTone]);
  const trainingId = group.context_type === "training" ? group.context_id : null;
  const learnersQuery = useQuery({ queryKey: ["group-chat", "invite-learners", groupId, trainingId, search], queryFn: ({ signal }) => listGroupChatLearners(trainingId!, { q: search, eligibleOnly: true, notInGroup: true, groupId, pageSize: 20, signal }), enabled: canInviteMembers && Boolean(trainingId), staleTime: 15000, retry: false });
  const providersQuery = useQuery({ queryKey: ["group-chat", "invite-providers", groupId, trainingId, search], queryFn: ({ signal }) => listGroupChatProviders(trainingId!, { q: search, signal }), enabled: canInviteMembers && Boolean(trainingId), staleTime: 15000, retry: false });
  const canReadCurrentGroupMembers = canInviteMembers && group.permissions.can_view_members === true;
  const currentMembersQuery = useQuery({ queryKey: inviteMemberKey(groupId), queryFn: ({ signal }) => listAllGroupChatMembers(groupId, signal), enabled: canReadCurrentGroupMembers, staleTime: 15000, retry: false });
  const learnersMutation = useMutation({ mutationFn: (userIds: string[]) => inviteEnrolledLearners(groupId, { user_ids: userIds }), retry: false, onMutate: () => setFeedback(null), onSuccess: async (result) => { setSelectedLearners([]); const message = formatGroupChatInvitationFeedback("learner", result); if (message) { setFeedbackTone(result.invited.length > 0 ? "success" : "warning"); setFeedback(message); } await queryClient.invalidateQueries({ queryKey: memberKey(groupId, "") }); }, onError: (error: Error) => { setFeedbackTone("error"); setFeedback(error.message); } });
  const currentGroupMembers = currentMembersQuery.data ?? [];
  const providers = currentMembersQuery.isPending || currentMembersQuery.isError ? [] : (providersQuery.data?.items ?? []).filter((provider) => !isGroupChatProviderUnavailableInCurrentGroup(provider.user_id, currentGroupMembers));
  const providerMutation = useMutation({ mutationFn: (userIds: string[]) => { const eligibleProviderIds = new Set(providers.map((provider) => provider.user_id)); if (userIds.some((userId) => !eligibleProviderIds.has(userId))) throw new Error("One or more selected Providers are no longer eligible for this Group Chat. Refresh the list and try again."); return inviteGroupMembers(groupId, userIds.map((userId) => { const provider = providers.find((item) => item.user_id === userId); return { user_id: userId, ...(provider?.name?.trim() ? { display_name: provider.name.trim() } : {}) }; })); }, retry: false, onMutate: () => setFeedback(null), onSuccess: async (result) => { setSelectedProviders([]); const message = formatGroupChatInvitationFeedback("Provider", result); if (message) { setFeedbackTone(result.invited.length > 0 ? "success" : "warning"); setFeedback(message); } await Promise.all([queryClient.invalidateQueries({ queryKey: memberKey(groupId, "") }), queryClient.invalidateQueries({ queryKey: inviteMemberKey(groupId) }), queryClient.invalidateQueries({ queryKey: groupKey(groupId) }), queryClient.invalidateQueries({ queryKey: ["group-chat", "invite-providers", groupId, trainingId] })]); }, onError: (error: Error) => { setFeedbackTone("error"); setFeedback(error.message); } });
  if (group.status?.trim().toLowerCase() === "closed") return <p className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-4 text-sm text-[#8b5e00]" role="status">This group is closed. It is read-only, so invitations are disabled.</p>;
  if (!canInviteMembers) return <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">You do not have permission to invite members to this Group Chat.</p>;
  if (!trainingId) return <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Additional invitations are available only for Training groups.</p>;
  const learners = learnersQuery.data?.items ?? [];
  const occupiedSlots = (group.member_count ?? 0) + (group.pending_invitation_count ?? 0);
  const capacityReached = group.max_members !== null && occupiedSlots >= group.max_members;
  const availableSlots = group.max_members === null ? Number.POSITIVE_INFINITY : Math.max(0, group.max_members - occupiedSlots);
  const selectedTotal = selectedLearners.length + selectedProviders.length;
  const toggleLearner = (learner: GroupChatLearner) => { if (!learner.user_id || !learner.can_invite) return; setSelectedLearners((current) => current.includes(learner.user_id!) ? current.filter((id) => id !== learner.user_id) : selectedTotal < availableSlots ? [...current, learner.user_id!] : current); };
  const toggleProvider = (provider: GroupChatProvider) => { if (provider.is_me) return; setSelectedProviders((current) => current.includes(provider.user_id) ? current.filter((id) => id !== provider.user_id) : selectedTotal < availableSlots ? [...current, provider.user_id] : current); };
  return <div className="space-y-4"><div><h3 className="text-base font-bold text-[#16332b]">Invite eligible members</h3><p className="mt-1 text-sm text-[#52736a]">Only authorized enrolled learners and verified Providers are shown.</p>{group.max_members !== null ? <p className="mt-1 text-xs text-[#7f9d94]">Capacity: {occupiedSlots} of {group.max_members} occupied, including pending invitations.</p> : null}</div><SearchInput value={search} onChange={setSearch} placeholder="Search eligible members" />{feedback ? <p className={`sticky top-3 z-20 ml-auto w-fit max-w-md rounded-xl border p-3 text-sm font-semibold shadow-sm ${feedbackTone === "error" ? "border-[#f3d5d1] bg-[#fff7f6] text-[#7a271a]" : feedbackTone === "warning" ? "border-[#f1d8ad] bg-[#fffaf0] text-[#8b5e00]" : "border-[#b7dfc7] bg-[#e8f6ee] text-[#1f6a58]"}`} role={feedbackTone === "error" ? "alert" : "status"}>{feedback}</p> : null}{capacityReached ? <p className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-3 text-sm text-[#8b5e00]">The Group Chat has reached its member capacity.</p> : null}{learnersQuery.isError ? <Retry message={learnersQuery.error.message} onRetry={() => void learnersQuery.refetch()} /> : <section><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold text-[#16332b]">Enrolled learners</h4><button type="button" disabled={capacityReached || selectedLearners.length === 0 || learnersMutation.isPending} onClick={() => learnersMutation.mutate(selectedLearners)} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{learnersMutation.isPending ? "Inviting..." : `Invite selected (${selectedLearners.length})`}</button></div><div className="mt-2 space-y-2">{learners.length === 0 ? <p className="text-sm text-[#52736a]">No eligible learners found.</p> : learners.map((learner) => <label key={learner.enrolment_id} className="flex items-center gap-3 rounded-xl border border-[#e1ebe6] p-3"><input type="checkbox" checked={Boolean(learner.user_id && selectedLearners.includes(learner.user_id))} disabled={capacityReached || !learner.user_id || !learner.can_invite || (Boolean(learner.user_id) && !selectedLearners.includes(learner.user_id) && selectedTotal >= availableSlots) || learnersMutation.isPending} onChange={() => toggleLearner(learner)} className="h-4 w-4 accent-[#1f6a58]" /><span><span className="block text-sm font-semibold text-[#16332b]">{learner.name}</span><span className="block text-xs text-[#52736a]">{learner.enrolment_status || "Eligible enrollment"}</span></span></label>)}</div></section>}{providersQuery.isError ? <Retry message={providersQuery.error.message} onRetry={() => void providersQuery.refetch()} /> : currentMembersQuery.isError ? <Retry message={currentMembersQuery.error.message} onRetry={() => void currentMembersQuery.refetch()} /> : <section><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold text-[#16332b]">Verified Providers</h4><button type="button" disabled={capacityReached || selectedProviders.length === 0 || providerMutation.isPending} onClick={() => providerMutation.mutate(selectedProviders)} className="rounded-full border border-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{providerMutation.isPending ? "Inviting..." : `Invite selected (${selectedProviders.length})`}</button></div><div className="mt-2 space-y-2">{canReadCurrentGroupMembers && currentMembersQuery.isPending ? <p className="text-sm text-[#52736a]">Checking current Group membership...</p> : providers.length === 0 ? <p className="text-sm text-[#52736a]">No additional verified Providers found.</p> : providers.filter((provider) => !provider.is_me).map((provider) => <label key={provider.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] p-3"><span className="flex items-center gap-3"><input type="checkbox" checked={selectedProviders.includes(provider.user_id)} disabled={capacityReached || (selectedTotal >= availableSlots && !selectedProviders.includes(provider.user_id)) || providerMutation.isPending} onChange={() => toggleProvider(provider)} className="h-4 w-4 accent-[#1f6a58]" /><span><span className="block text-sm font-semibold text-[#16332b]">{provider.name}</span><span className="block text-xs text-[#52736a]">{provider.registration_number || "Verified Provider"}</span></span></span></label>)}</div></section>}</div>;
}

function Settings({ group, groupId }: { group: GroupChatDetails; groupId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [adminsOnlyPosting, setAdminsOnlyPosting] = useState<boolean | null>(group.admins_only_posting);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [closeConfirmation, setCloseConfirmation] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenConfirmation, setReopenConfirmation] = useState(false);
  const [replacementAvatarFile, setReplacementAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const replacementAvatarPreviewUrl = useGroupAvatarPreview(replacementAvatarFile);
  const groupIsClosed = group.status?.trim().toLowerCase() === "closed";
  const canEdit = canEditGroupChat(group);
  const canUpdatePosting = canUpdateGroupChatSettings(group);
  const canClose = canCloseGroupChat(group);
  const canReopen = canReopenGroupChat(group);
  const refresh = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: groupKey(groupId) }), queryClient.invalidateQueries({ queryKey: groupsKey })]); };
  const detailsMutation = useMutation({ mutationFn: async () => { const avatarUrl = replacementAvatarFile ? await uploadGroupAvatar(replacementAvatarFile) : undefined; return updateGroupDetails(groupId, { name: name.trim(), description: description.trim(), ...(avatarUrl ? { avatar_url: avatarUrl } : {}) }); }, retry: false, onSuccess: async () => { setReplacementAvatarFile(null); setAvatarError(null); setFeedback("Group details saved."); await refresh(); }, onError: (error: Error) => setFeedback(error.message) });
  const settingsMutation = useMutation({ mutationFn: () => updateGroupSettings(groupId, { admins_only_posting: adminsOnlyPosting as boolean }), retry: false, onSuccess: async () => { setFeedback("Messaging permissions saved."); await refresh(); }, onError: (error: Error) => setFeedback(error.message) });
  const closeMutation = useMutation({ mutationFn: () => closeGroupChat(groupId), retry: false, onSuccess: async () => { setCloseConfirmation(false); setFeedback("Group closed. It is now read-only."); await refresh(); }, onError: (error: Error) => setFeedback(error.message) });
  const reopenMutation = useMutation({ mutationFn: (payload: { reason: string }) => reopenGroupChat(groupId, payload.reason), retry: false, onSuccess: async () => { setReopenConfirmation(false); setReopenReason(""); setFeedback("Group reopened successfully."); await refresh(); }, onError: (error: Error) => setFeedback(error.message) });
  const reopenReasonError = getGroupChatReopenReasonError(reopenReason);
  const hasControls = canEdit || canUpdatePosting || canClose;
  if (groupIsClosed) return <div className="space-y-4"><div className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-4" role="status"><p className="text-base font-bold text-[#8b5e00]">This group is closed.</p><p className="mt-1 text-sm text-[#8b5e00]">The group is read-only. Editing, inviting, and posting are disabled.</p></div>{feedback ? <p className="rounded-xl border border-[#b7dfc7] bg-[#e8f6ee] p-3 text-sm font-semibold text-[#1f6a58]" role="status">{feedback}</p> : null}{canReopen ? <section className="rounded-xl border border-[#e1ebe6] p-4"><h3 className="text-base font-bold text-[#16332b]">Reopen Group</h3><p className="mt-1 text-sm text-[#52736a]">Provide a reason before confirming that this group should be reopened.</p><label className="mt-3 block text-sm font-semibold text-[#16332b]">Reason<textarea value={reopenReason} maxLength={255} onChange={(event) => { setReopenReason(event.target.value); setReopenConfirmation(false); }} disabled={reopenMutation.isPending} aria-invalid={Boolean(reopenReasonError)} className="mt-1 min-h-24 w-full rounded-xl border border-[#d7e5df] p-3 font-normal" /></label>{reopenReasonError ? <p className="mt-1 text-xs text-[#b42318]" role="alert">{reopenReasonError}</p> : null}{reopenConfirmation ? <div className="mt-3 rounded-lg border border-[#f1d8ad] bg-[#fffaf0] p-3 text-sm"><p className="font-semibold text-[#8b5e00]">Reopen this group?</p><p className="mt-1 text-[#8b5e00]">The group will become available according to the refreshed backend permissions.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={reopenMutation.isPending} onClick={() => { const payload = buildReopenGroupPayload(reopenReason); if (payload) reopenMutation.mutate(payload); }} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{reopenMutation.isPending ? "Reopening..." : "Confirm reopen"}</button><button type="button" disabled={reopenMutation.isPending} onClick={() => setReopenConfirmation(false)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#16332b]">Cancel</button></div></div> : <button type="button" disabled={Boolean(reopenReasonError) || reopenMutation.isPending} onClick={() => setReopenConfirmation(true)} className="mt-3 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reopen Group</button>}</section> : <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3 text-sm text-[#52736a]">This group cannot be reopened by your current permissions.</p>}</div>;
  if (!hasControls) return <div className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Group settings are not available for your current permissions.</div>;
  return <div className="space-y-4">{feedback ? <p className="rounded-xl border border-[#b7dfc7] bg-[#e8f6ee] p-3 text-sm font-semibold text-[#1f6a58]" role="status">{feedback}</p> : null}{canEdit ? <section className="rounded-xl border border-[#e1ebe6] p-4"><h3 className="text-base font-bold text-[#16332b]">Group details</h3><label className="mt-3 block text-sm font-semibold text-[#16332b]">Name<input required value={name} onChange={(event) => setName(event.target.value)} disabled={detailsMutation.isPending} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal" /></label><label className="mt-3 block text-sm font-semibold text-[#16332b]">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={detailsMutation.isPending} className="mt-1 min-h-24 w-full rounded-xl border border-[#d7e5df] p-3 font-normal" /></label><GroupAvatarPicker name={group.name} currentUrl={group.avatar_url} previewUrl={replacementAvatarPreviewUrl} fileName={replacementAvatarFile?.name ?? null} error={avatarError} disabled={detailsMutation.isPending} onSelect={(file) => { if (file && !isSupportedGroupAvatarFile(file)) { setReplacementAvatarFile(null); setAvatarError("Select an image file for the Group Chat avatar."); return; } setAvatarError(null); setReplacementAvatarFile(file); }} onClear={() => { setReplacementAvatarFile(null); setAvatarError(null); }} /><button type="button" disabled={!name.trim() || Boolean(avatarError) || detailsMutation.isPending} onClick={() => detailsMutation.mutate()} className="mt-3 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{detailsMutation.isPending ? "Saving..." : "Save details"}</button><p className="mt-2 text-xs text-[#7f9d94]">Training context and Group type cannot be changed here.</p></section> : null}{canUpdatePosting ? <section className="rounded-xl border border-[#e1ebe6] p-4"><h3 className="text-base font-bold text-[#16332b]">Messaging permissions</h3><fieldset disabled={settingsMutation.isPending || adminsOnlyPosting === null} className="mt-3 space-y-2 text-sm text-[#16332b]"><legend className="sr-only">Who can send messages</legend><label className="flex items-center gap-2"><input type="radio" name={`posting-permission-${groupId}`} checked={adminsOnlyPosting === true} onChange={() => setAdminsOnlyPosting(true)} /> Only Admins can send messages</label><label className="flex items-center gap-2"><input type="radio" name={`posting-permission-${groupId}`} checked={adminsOnlyPosting === false} onChange={() => setAdminsOnlyPosting(false)} /> All Members can send messages</label></fieldset><button type="button" disabled={adminsOnlyPosting === null || settingsMutation.isPending} onClick={() => settingsMutation.mutate()} className="mt-3 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{settingsMutation.isPending ? "Saving..." : "Save permissions"}</button></section> : null}{canClose ? <section className="rounded-xl border border-[#efc4bd] bg-[#fff7f6] p-4" aria-labelledby="group-management-heading"><h3 id="group-management-heading" className="text-base font-bold text-[#16332b]">Group Management</h3><p className="mt-1 text-sm text-[#7a271a]">Closing this group makes it read-only and starts the retention period.</p>{closeConfirmation ? <div className="mt-3 rounded-lg border border-[#efc4bd] bg-white p-3 text-sm"><p className="font-semibold text-[#16332b]">Close this group?</p><p className="mt-1 text-[#52736a]">Closing this group makes it read-only and starts the retention period. Members will no longer be able to send messages.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate()} className="rounded-full bg-[#b54708] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{closeMutation.isPending ? "Closing..." : "Close Group"}</button><button type="button" disabled={closeMutation.isPending} onClick={() => setCloseConfirmation(false)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#16332b]">Cancel</button></div></div> : <button type="button" onClick={() => setCloseConfirmation(true)} className="mt-3 rounded-full border border-[#b54708] px-4 py-2 text-sm font-semibold text-[#b54708]">Close Group</button>}</section> : null}</div>;
}

export default function GroupChatWorkspace({ groupId, onClose }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const query = useQuery({ queryKey: groupKey(groupId), queryFn: ({ signal }) => getGroupChat(groupId, signal), staleTime: 15000, retry: false });
  const currentMemberQuery = useQuery({ queryKey: ["group-chat", "current-member", groupId], queryFn: ({ signal }) => listAllGroupChatMembers(groupId, signal), enabled: query.data?.permissions.can_view_members === true, staleTime: 15000, retry: false });

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [detailsOpen]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [groupId]);

  if (query.isPending) return <section className="flex min-h-0 flex-1 items-center rounded-2xl border border-[#e1ebe6] bg-white p-4 text-sm text-[#52736a]">Loading Group Chat details...</section>;
  if (query.isError) return <Retry message={query.error.message} onRetry={() => void query.refetch()} />;
  const group = query.data;
  const groupIsClosed = group.status?.trim().toLowerCase() === "closed";
  const canViewMembers = group.permissions.can_view_members === true;
  const canInviteMembers = group.status?.trim().toLowerCase() !== "closed" && group.permissions.can_invite === true;
  const currentMember = currentMemberQuery.data?.find((member) => member.is_current_user);
  const conversationClass = detailsOpen ? "hidden" : "flex";
  return <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm sm:p-4">
    <div className={`${conversationClass} min-h-0 flex-1 flex-col`} aria-hidden={detailsOpen}>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <button type="button" onClick={() => setDetailsOpen(true)} aria-label={`Open group details for ${group.name}`} className="flex min-w-0 items-center gap-3 rounded-xl text-left hover:bg-[#f9fcfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">
          <GroupAvatarDisplay name={group.name} url={group.avatar_url} size="medium" />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-[#06201c]">{group.name}</span>
            <span className="mt-0.5 block text-xs text-[#52736a]">{group.member_count ?? "—"} members</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${groupIsClosed ? "bg-[#fff3d6] text-[#8b5e00]" : "bg-[#e8f6ee] text-[#1f6a58]"}`}>{groupIsClosed ? "Closed" : group.status || "Active"}</span>
          {onClose ? <button type="button" aria-label="Close group view" title="Close conversation" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#b7dfc7] bg-[#e8f6ee] text-[#1f6a58] shadow-sm transition-colors hover:bg-[#d7efe1] hover:text-[#16332b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button> : null}
        </div>
      </div>
      <div className="mt-2 min-h-0 flex-1 flex flex-col">
        <GroupChatMessages groupId={group.id} groupStatus={group.status} canPost={group.permissions.can_post} postingMuted={currentMember?.posting_muted ?? null} canHideMessages={group.permissions.can_hide_messages} currentMemberStatus={currentMember?.membership_status ?? null} />
      </div>
    </div>
    {detailsOpen ? <GroupDetailsPanel group={group} groupId={groupId} canViewMembers={canViewMembers} canInviteMembers={canInviteMembers} onClose={() => setDetailsOpen(false)} /> : null}
  </section>;
}
function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="sr-only">{placeholder}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label>;
}
