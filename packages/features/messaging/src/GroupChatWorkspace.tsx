"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@ihp/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeGroupMemberRole, closeGroupChat, createGroupChatReport, downloadGroupChatAttachment, getGroupChat, getGroupChatGrievanceOfficer, inviteEnrolledLearners, inviteGroupMembers, leaveGroupChat, listGroupChatFiles, listGroupChatLearners, listGroupChatMembers, listGroupChatProviders, muteGroupMemberPosting, removeGroupMember, reopenGroupChat, searchGroupChatMessages, transferGroupOwnership, unmuteGroupMemberPosting, updateGroupDetails, updateGroupPreferences, updateGroupSettings, uploadGroupAvatar, withdrawGroupChatConsent } from "./group-chat/group-chat.service";
import { buildGroupChatReportPayload, buildReopenGroupPayload, canCloseGroupChat, canEditGroupChat, canReopenGroupChat, canUpdateGroupChatSettings, formatGroupChatInvitationFeedback, formatGroupChatSharedFileSize, getGroupChatLeaveAction, getGroupChatMemberOwnershipAction, getGroupChatMemberPostingAction, getGroupChatMemberRemovalAction, getGroupChatMemberRoleActions, getGroupChatReopenReasonError, getGroupChatSafeMessagePreview, getGroupChatSearchViewState, GROUP_CHAT_REPORT_REASONS, isGroupChatProviderUnavailableInCurrentGroup, isSupportedGroupAvatarFile, splitGroupChatMembers, type GroupChatMemberAction, type GroupChatMemberRoleAction } from "./group-chat-models";
import { GroupChatApiError } from "./group-chat/group-chat.service";
import type { GroupChatDetails, GroupChatLearner, GroupChatListResponse, GroupChatMember, GroupChatPermissions, GroupChatProvider, GroupChatSharedFile } from "./group-chat/group-chat.types";
import { GroupAvatarDisplay, GroupAvatarPicker, useGroupAvatarPreview } from "./GroupChatAvatar";
import GroupChatMessages from "./GroupChatMessages";

type Props = { groupId: string; onClose?: () => void };
const groupKey = (groupId: string, userScope?: string) => userScope ? ["group-chat", "group", groupId, userScope] : ["group-chat", "group", groupId];
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

function GroupChatReportForm({ groupId, messageId, title }: { groupId: string; messageId: string | null; title: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildGroupChatReportPayload(messageId, reason, details);
      if (!payload) throw new GroupChatApiError(422, "A non-empty report reason is required.");
      return createGroupChatReport(groupId, payload);
    },
    retry: false,
    onSuccess: () => { setOpen(false); setReason(""); setDetails(""); setFeedback("Report submitted. It has not been resolved yet."); },
    onError: (error: Error) => setFeedback(error.message),
  });
  useEffect(() => {
    setOpen(false);
    setReason("");
    setDetails("");
    setFeedback(null);
    mutation.reset();
  }, [groupId, messageId]);
  return <section className="rounded-xl border border-[#e1ebe6] p-3">
    <h4 className="text-sm font-bold text-[#16332b]">{title}</h4>
    <p className="mt-1 text-xs text-[#52736a]">Reports are sent to your clinic's Compliance team and the platform's Super Admin team for review.</p>
    {feedback ? <p className="mt-3 rounded-lg border border-[#b7dfc7] bg-[#e8f6ee] p-2 text-xs font-semibold text-[#1f6a58]" role="status">{feedback}</p> : null}
    {open ? <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}>
      <label className="block text-xs font-semibold text-[#16332b]">Reason<select required value={reason} onChange={(event) => { setReason(event.target.value); setFeedback(null); }} disabled={mutation.isPending} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-sm font-normal"><option value="">Select a reason</option>{GROUP_CHAT_REPORT_REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="block text-xs font-semibold text-[#16332b]">Details<span className="font-normal text-[#52736a]"> (optional)</span><textarea value={details} onChange={(event) => setDetails(event.target.value)} disabled={mutation.isPending} rows={3} className="mt-1 w-full rounded-lg border border-[#d7e5df] p-2 text-sm font-normal" /></label>
      {mutation.error ? <p className="text-xs text-[#7a271a]" role="alert">{mutation.error.message}</p> : null}
      <div className="flex gap-2"><button type="submit" disabled={mutation.isPending || !reason.trim()} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{mutation.isPending ? "Submitting..." : "Submit report"}</button><button type="button" disabled={mutation.isPending} onClick={() => { setOpen(false); setFeedback(null); }} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button></div>
    </form> : <button type="button" onClick={() => { setOpen(true); setFeedback(null); }} className="mt-3 rounded-full border border-[#7a271a] px-3 py-1.5 text-xs font-semibold text-[#7a271a]">{messageId ? "Report message" : "Report Group"}</button>}
  </section>;
}

function GrievanceOfficer({ userScope }: { userScope: string }) {
  const query = useQuery({ queryKey: ["group-chat", "grievance-officer", userScope], queryFn: ({ signal }) => getGroupChatGrievanceOfficer(signal), enabled: Boolean(userScope), retry: false });
  if (query.isPending) return <section className="rounded-xl border border-[#e1ebe6] p-3"><h4 className="text-sm font-bold text-[#16332b]">Grievance Officer</h4><p className="mt-2 text-xs text-[#52736a]" aria-live="polite">Loading Grievance Officer details...</p></section>;
  if (query.isError) return <section className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3"><h4 className="text-sm font-bold text-[#16332b]">Grievance Officer</h4><p className="mt-2 text-xs text-[#7a271a]" role="alert">{query.error.message}</p><button type="button" onClick={() => void query.refetch()} className="mt-2 text-xs font-semibold underline">Try again</button></section>;
  const officer = query.data;
  if (!officer?.configured) return <section className="rounded-xl border border-[#e1ebe6] p-3"><h4 className="text-sm font-bold text-[#16332b]">Grievance Officer</h4><p className="mt-2 text-xs text-[#52736a]">Grievance officer details have not been configured.</p></section>;
  return <section className="rounded-xl border border-[#e1ebe6] p-3"><h4 className="text-sm font-bold text-[#16332b]">Grievance Officer</h4>{officer.name || officer.email || officer.phone ? <dl className="mt-2 grid gap-2 text-xs text-[#16332b] sm:grid-cols-3">{officer.name ? <div><dt className="font-semibold text-[#52736a]">Name</dt><dd>{officer.name}</dd></div> : null}{officer.email ? <div><dt className="font-semibold text-[#52736a]">Email</dt><dd className="break-words">{officer.email}</dd></div> : null}{officer.phone ? <div><dt className="font-semibold text-[#52736a]">Phone</dt><dd>{officer.phone}</dd></div> : null}</dl> : <p className="mt-2 text-xs text-[#52736a]">No contact details are available.</p>}</section>;
}

function GroupDetailsOverview({ group, groupId, userScope }: { group: GroupChatDetails; groupId: string; userScope: string }) {
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
    {group.permissions.can_report === true ? <GroupChatReportForm groupId={groupId} messageId={null} title="Report Group" /> : null}
    <GrievanceOfficer userScope={userScope} />
  </div>;
}
function isLoadedGroupMessage(messageId: string): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-group-message-id]")).some((element) => element.dataset.groupMessageId === messageId);
}

function sharedFileIcon(type: GroupChatSharedFile["attachment_type"]): string {
  if (type === "image") return "▧";
  if (type === "audio") return "♫";
  if (type === "video") return "▶";
  return "▤";
}

function sharedFileDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

function sharedFileError(error: unknown): string {
  if (error instanceof GroupChatApiError && error.status === 403) return "This file is unavailable or access is denied.";
  if (error instanceof GroupChatApiError && error.status === 404) return "This file is no longer available.";
  return "The file could not be opened right now.";
}

function SharedFileRow({ file }: { file: GroupChatSharedFile }) {
  const [pendingAction, setPendingAction] = useState<"open" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const category = file.attachment_type.charAt(0).toUpperCase() + file.attachment_type.slice(1);
  const openFile = async (download: boolean) => {
    if (pendingAction) return;
    setPendingAction(download ? "download" : "open");
    setError(null);
    try {
      const response = await downloadGroupChatAttachment(file.attachment_id);
      const objectUrl = window.URL.createObjectURL(response.blob);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = response.fileName || file.file_name;
        anchor.rel = "noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1500);
    } catch (requestError: unknown) {
      setError(sharedFileError(requestError));
    } finally {
      setPendingAction(null);
    }
  };
  return <article className="rounded-xl border border-[#e1ebe6] bg-white p-3">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f6ee] text-lg font-bold text-[#1f6a58]" aria-hidden="true">{sharedFileIcon(file.attachment_type)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#16332b]" title={file.file_name}>{file.file_name}</p>
        <p className="mt-1 text-xs text-[#52736a]">{category} · {formatGroupChatSharedFileSize(file.file_size)} · {sharedFileDate(file.created_at)}</p>
        {error ? <p className="mt-1 text-xs text-[#8f3b2f]" role="alert">{error}</p> : null}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" disabled={pendingAction !== null} onClick={() => void openFile(false)} className="rounded-full border border-[#d7e5df] px-2.5 py-1 text-[11px] font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:opacity-50">{pendingAction === "open" ? "Opening..." : "Open"}</button>
        <button type="button" disabled={pendingAction !== null} onClick={() => void openFile(true)} className="rounded-full border border-[#d7e5df] px-2.5 py-1 text-[11px] font-semibold text-[#1f6a58] hover:bg-[#f4faf7] disabled:opacity-50">{pendingAction === "download" ? "Downloading..." : "Download"}</button>
      </div>
    </div>
  </article>;
}

function SharedFiles({ groupId }: { groupId: string }) {
  const query = useQuery({
    queryKey: ["group-chat", "files", groupId],
    queryFn: ({ signal }) => listGroupChatFiles(groupId, { signal }),
    refetchOnMount: "always",
    retry: false,
  });
  if (query.isPending) return <p className="text-sm text-[#52736a]">Loading shared files...</p>;
  if (query.isError) return <Retry message="Shared files could not be loaded." onRetry={() => void query.refetch()} />;
  if (!query.data?.items.length) return <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No shared files yet.</p>;
  return <div className="space-y-2">{query.data.items.map((file) => <SharedFileRow key={`${file.attachment_id}-${file.message_id}`} file={file} />)}</div>;
}

function SearchMessages({ groupId, onNavigateToLoadedMessage }: { groupId: string; onNavigateToLoadedMessage: (messageId: string) => void }) {
  const [queryText, setQueryText] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const searchQuery = useQuery({
    queryKey: ["group-chat", "search", groupId, submittedQuery],
    queryFn: ({ signal }) => searchGroupChatMessages(groupId, submittedQuery, { signal }),
    enabled: submittedQuery.length >= 2,
    retry: false,
  });
  useEffect(() => {
    setQueryText("");
    setSubmittedQuery("");
  }, [groupId]);
  const trimmedQuery = queryText.trim();
  const queryError = trimmedQuery.length > 0 && trimmedQuery.length < 2 ? "Enter at least 2 characters to search." : null;
  const searchState = getGroupChatSearchViewState(trimmedQuery, submittedQuery, searchQuery.isFetching, searchQuery.isError, searchQuery.data?.items.length ?? null);
  return <div className="space-y-3">
    <div className="flex gap-2"><label className="sr-only" htmlFor={`group-message-search-${groupId}`}>Search messages</label><input id={`group-message-search-${groupId}`} value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search messages" className="h-10 min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /><button type="button" disabled={trimmedQuery.length < 2 || searchQuery.isFetching} onClick={() => setSubmittedQuery(trimmedQuery)} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{searchQuery.isFetching ? "Searching..." : "Search"}</button></div>
    {queryError ? <p className="text-xs text-[#b42318]" role="alert">{queryError}</p> : null}
    {searchState === "idle" ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Enter at least 2 characters, then select Search.</p> : null}
    {searchState === "error" ? <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert"><p>{searchQuery.error instanceof Error ? searchQuery.error.message : "Unable to search messages."}</p><button type="button" onClick={() => void searchQuery.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : null}
    {searchState === "loading" ? <p className="text-sm text-[#52736a]">Searching messages...</p> : null}
    {searchState === "empty" ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No messages found.</p> : null}
    {searchQuery.data?.items.length && trimmedQuery === submittedQuery.trim() ? <div className="space-y-2">{searchQuery.data.items.map((message) => { const loaded = isLoadedGroupMessage(message.id); return <div key={message.id} className="rounded-xl border border-[#e1ebe6] bg-white p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#16332b]">{message.sender_name}</p><p className="mt-1 line-clamp-2 text-sm text-[#52736a]">{getGroupChatSafeMessagePreview(message)}</p></div><button type="button" disabled={!loaded} onClick={() => onNavigateToLoadedMessage(message.id)} className="shrink-0 rounded-full border border-[#d7e5df] px-2.5 py-1 text-[11px] font-semibold text-[#1f6a58] disabled:cursor-default disabled:opacity-50">{loaded ? "Open" : "Not loaded"}</button></div></div>; })}</div> : null}
  </div>;
}

type GroupDetailsTab = "overview" | "members" | "invite" | "search" | "files" | "settings";
function GroupDetailsPanel({ group, groupId, userScope, canViewMembers, canInviteMembers, onClose, onLeave, onNavigateToLoadedMessage }: { group: GroupChatDetails; groupId: string; userScope: string; canViewMembers: boolean; canInviteMembers: boolean; onClose: () => void; onLeave: () => void; onNavigateToLoadedMessage: (messageId: string) => void }) {
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
    <div className="shrink-0 px-3 pt-3 sm:px-4">
      <PersonalMembershipActions group={group} groupId={groupId} userScope={userScope} onLeave={onLeave} />
    </div>
    <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-[#e1ebe6] px-3 py-2 sm:px-4" role="tablist" aria-label="Group management">
      {([["overview", "Overview"], ["members", "Members"], ["invite", "Invite members"], ["search", "Search"], ["files", "Shared Files"], ["settings", "Settings"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={tab === value ? "rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white" : "rounded-full bg-[#f4faf7] px-3 py-1.5 text-xs font-semibold text-[#52736a]"}>{label}</button>)}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
      {tab === "overview" ? <GroupDetailsOverview group={group} groupId={groupId} userScope={userScope} /> : tab === "members" ? <Members groupId={groupId} ownerUserId={group.owner_user_id} groupStatus={group.status} permissions={group.permissions} canViewMembers={canViewMembers} /> : tab === "invite" ? <Invite group={group} groupId={groupId} canInviteMembers={canInviteMembers} /> : tab === "search" ? <SearchMessages key={groupId} groupId={groupId} onNavigateToLoadedMessage={onNavigateToLoadedMessage} /> : tab === "files" ? <SharedFiles key={groupId} groupId={groupId} /> : <Settings group={group} groupId={groupId} />}
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

function GroupPreferenceActions({ group, groupId, userScope }: { group: GroupChatDetails; groupId: string; userScope: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const preferenceMutation = useMutation({
    mutationFn: (next: { muted: boolean; pinned: boolean }) => updateGroupPreferences(groupId, next),
    retry: false,
    onSuccess: async (updated) => {
      queryClient.setQueryData(groupKey(groupId, userScope), updated);
      queryClient.setQueriesData<GroupChatListResponse>({ queryKey: groupsKey }, (current) => current ? { ...current, items: current.items.map((item) => item.id === updated.id ? { ...item, muted: updated.muted, pinned: updated.pinned, is_archived: updated.is_archived } : item) } : current);
      await queryClient.invalidateQueries({ queryKey: groupsKey });
      setFeedback("Group preferences updated.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });
  const isProgramGroup = group.kind?.trim().toLowerCase() === "program";
  const stateKnown = typeof group.muted === "boolean" && typeof group.pinned === "boolean";
  if (!isProgramGroup) return null;
  return <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-3 py-2" aria-label="Personal group preferences">
    <span className="mr-1 text-xs font-semibold text-[#52736a]">For you</span>
    <button type="button" disabled={!stateKnown || preferenceMutation.isPending} onClick={() => preferenceMutation.mutate({ muted: !group.muted, pinned: group.pinned === true })} className="rounded-full border border-[#d7e5df] bg-white px-2.5 py-1 text-xs font-semibold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:cursor-not-allowed disabled:opacity-50">{group.muted ? "Unmute Group" : "Mute Group"}</button>
    <button type="button" disabled={!stateKnown || preferenceMutation.isPending} onClick={() => preferenceMutation.mutate({ muted: group.muted === true, pinned: !group.pinned })} className="rounded-full border border-[#d7e5df] bg-white px-2.5 py-1 text-xs font-semibold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:cursor-not-allowed disabled:opacity-50">{group.pinned ? "Unpin Group" : "Pin Group"}</button>
    {preferenceMutation.isPending ? <span className="text-xs text-[#52736a]" role="status">Saving...</span> : feedback ? <span className="text-xs text-[#52736a]" role="status">{feedback}</span> : null}
  </div>;
}

function PersonalMembershipActions({ group, groupId, userScope, onLeave }: { group: GroupChatDetails; groupId: string; userScope: string; onLeave: () => void }) {
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<"leave" | "withdraw" | null>(null);
  const isProgramGroup = group.kind?.trim().toLowerCase() === "program";
  const canLeave = group.permissions.can_leave === true;
  const leaveAction = getGroupChatLeaveAction({ myRole: group.my_role, ownerUserId: group.owner_user_id, currentUserId: userScope, canLeave });
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroupChat(groupId),
    retry: false,
    onSuccess: async () => {
      setConfirmation(null);
      await clearPrivateGroupState();
      onLeave();
    },
  });
  const withdrawMutation = useMutation({
    mutationFn: () => withdrawGroupChatConsent(groupId),
    retry: false,
    onSuccess: async () => {
      setConfirmation(null);
      await clearPrivateGroupState();
      onLeave();
    },
  });
  const pending = leaveMutation.isPending || withdrawMutation.isPending;
  const leaveErrorMessage = leaveMutation.error instanceof GroupChatApiError && leaveMutation.error.status === 409 ? "Transfer group ownership before leaving." : leaveMutation.error?.message;
  const errorMessage = leaveErrorMessage ?? withdrawMutation.error?.message;

  async function clearPrivateGroupState() {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: groupKey(groupId, userScope) }),
      queryClient.cancelQueries({ queryKey: ["group-chat", "messages", groupId] }),
      queryClient.cancelQueries({ queryKey: ["group-chat", "read-status", groupId] }),
      queryClient.cancelQueries({ queryKey: ["group-chat", "reactions", groupId] }),
      queryClient.cancelQueries({ queryKey: ["group-chat", "pinned", groupId] }),
      queryClient.cancelQueries({ queryKey: ["group-chat", "members", groupId] }),
      queryClient.cancelQueries({ queryKey: ["group-chat", "current-member", groupId] }),
    ]);
    queryClient.removeQueries({ queryKey: groupKey(groupId, userScope) });
    queryClient.removeQueries({ queryKey: ["group-chat", "messages", groupId] });
    queryClient.removeQueries({ queryKey: ["group-chat", "read-status", groupId] });
    queryClient.removeQueries({ queryKey: ["group-chat", "reactions", groupId] });
    queryClient.removeQueries({ queryKey: ["group-chat", "pinned", groupId] });
    queryClient.removeQueries({ queryKey: ["group-chat", "members", groupId] });
    queryClient.removeQueries({ queryKey: ["group-chat", "current-member", groupId] });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: groupsKey }),
      queryClient.invalidateQueries({ queryKey: ["group-chat", "invitations"] }),
      queryClient.invalidateQueries({ queryKey: ["group-chat", "consents", userScope] }),
    ]);
  }

  if (leaveAction === "hidden" && !isProgramGroup) return null;
  return <section className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4" aria-labelledby="personal-membership-heading">
    <h3 id="personal-membership-heading" className="text-base font-bold text-[#16332b]">Your membership</h3>
    <p className="mt-1 text-sm text-[#52736a]">These actions affect only your access to this Group Chat.</p>
    {errorMessage ? <p className="mt-3 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert">{errorMessage}</p> : null}
    <div className="mt-3 flex flex-wrap gap-2">
      {leaveAction !== "hidden" ? <button type="button" disabled={pending || leaveAction !== "enabled"} onClick={() => setConfirmation("leave")} className="rounded-full border border-[#b54708] px-3 py-1.5 text-xs font-semibold text-[#b54708] disabled:cursor-not-allowed disabled:opacity-50">Leave Group</button> : null}
      {leaveAction === "disabled-owner" ? <p className="basis-full text-sm text-[#8b5e00]">Transfer group ownership to another eligible provider before you can leave this group.</p> : null}
      {isProgramGroup ? <button type="button" disabled={pending} onClick={() => setConfirmation("withdraw")} className="rounded-full border border-[#7a271a] px-3 py-1.5 text-xs font-semibold text-[#7a271a] disabled:opacity-50">Withdraw consent</button> : null}
    </div>
    {confirmation ? <div className="mt-3 rounded-lg border border-[#f1d8ad] bg-[#fffaf0] p-3 text-sm" role="alertdialog" aria-label={confirmation === "leave" ? "Confirm leaving group" : "Confirm withdrawing consent"}>
      <p className="font-semibold text-[#8b5e00]">{confirmation === "leave" ? "Leave this Group Chat?" : "Withdraw Group Chat consent?"}</p>
      <p className="mt-1 text-[#8b5e00]">{confirmation === "leave" ? "You will lose access to this group. Group Owners must transfer ownership before leaving." : "Withdrawal takes effect immediately, ends your access to this group, and keeps the consent record with its withdrawal time."}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => confirmation === "leave" ? leaveMutation.mutate() : withdrawMutation.mutate()} className="rounded-full bg-[#b54708] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Updating..." : confirmation === "leave" ? "Confirm leave" : "Confirm withdrawal"}</button>
        <button type="button" disabled={pending} onClick={() => setConfirmation(null)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button>
      </div>
    </div> : null}
  </section>;
}

export default function GroupChatWorkspace({ groupId, onClose }: Props) {
  const { user } = useAuth();
  const userScope = user?.userId ?? user?.id ?? "";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const query = useQuery({ queryKey: groupKey(groupId, userScope), queryFn: ({ signal }) => getGroupChat(groupId, signal), enabled: Boolean(userScope), staleTime: 15000, retry: false });
  const currentMemberQuery = useQuery({ queryKey: ["group-chat", "current-member", groupId, userScope], queryFn: ({ signal }) => listAllGroupChatMembers(groupId, signal), enabled: Boolean(userScope) && query.data?.permissions.can_view_members === true, staleTime: 15000, retry: false });

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
  const navigateToLoadedMessage = (messageId: string) => {
    if (!isLoadedGroupMessage(messageId)) return;
    setDetailsOpen(false);
    window.setTimeout(() => {
      const element = Array.from(document.querySelectorAll<HTMLElement>("[data-group-message-id]")).find((candidate) => candidate.dataset.groupMessageId === messageId);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };
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
      <GroupPreferenceActions key={`${groupId}:${userScope}`} group={group} groupId={groupId} userScope={userScope} />
      <div className="mt-2 min-h-0 flex-1 flex flex-col">
        <GroupChatMessages groupId={group.id} groupStatus={group.status} groupKind={group.kind} memberDirectory={currentMemberQuery.data ?? []} canPost={group.permissions.can_post} postingMuted={currentMember?.posting_muted ?? null} canHideMessages={group.permissions.can_hide_messages} canPinMessages={group.permissions.can_pin_messages} canReport={group.permissions.can_report} currentMemberKind={currentMember?.member_kind ?? null} currentMemberStatus={currentMember?.membership_status ?? null} />
      </div>
    </div>
    {detailsOpen ? <GroupDetailsPanel group={group} groupId={groupId} userScope={userScope} canViewMembers={canViewMembers} canInviteMembers={canInviteMembers} onClose={() => setDetailsOpen(false)} onLeave={() => { setDetailsOpen(false); onClose?.(); }} onNavigateToLoadedMessage={navigateToLoadedMessage} /> : null}
  </section>;
}
function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="sr-only">{placeholder}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label>;
}
