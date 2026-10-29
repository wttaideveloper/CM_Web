"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@ihp/auth";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addGroupChatMessageReaction, createGroupChatReport, downloadGroupChatAttachment, editGroupChatMessage, getGroupChatMessageReadStatus, getGroupChatReactions, hideGroupChatMessage, listGroupChatMessages, listGroupChatPinnedMessages, markGroupChatRead, pinGroupChatMessage, removeGroupChatMessageReaction, retractGroupChatMessage, sendGroupChatAttachmentMessage, sendGroupChatTextMessage, unpinGroupChatMessage, uploadGroupChatAttachment } from "./group-chat/group-chat.service";
import { groupChatReadStatusQueryKey, mergeGroupChatReadStatusCache, reconcileGroupChatReadState, resolveGroupChatReadThroughBoundary, shouldForceGroupChatReadStatusRefresh, shouldQueueGroupChatReadStatuses, shouldReconcileGroupChatReadAfterReconnect, type GroupChatReadReconciliationState } from "./group-chat/group-chat-read-state";
import { buildEditGroupChatMessagePayload, buildGroupChatReportPayload, canEditGroupChatMessage, canHideGroupChatMessage, canPinGroupChatMessage, canReactToGroupChatMessage, canReplyToGroupChatMessage, canReportGroupChatMessage, canRetractGroupChatMessage, canSendGroupChatMessage, canShowGroupChatReadStatusIndicator, canViewGroupChatReadStatus, formatGroupChatAttachmentSummary, getGroupChatMessageDisplayText, getGroupChatPostingRestrictionState, getGroupChatReadStatusMemberNames, getGroupChatReadStatusTickState, getGroupChatReadSummaryTickState, getGroupChatReplyPreview, getGroupChatReplyReferencePreview, GROUP_CHAT_REPORT_REASONS, isGroupChatReactionSelected, mergeGroupChatMessagePages, normalizeGroupChatReactionCounts, resolveGroupChatAttachmentMetadata, shouldFetchGroupChatMessageReadStatus } from "./group-chat-models";
import { getGroupChatScrollTopAfterPrepend, isGroupChatNearBottom, shouldFollowGroupChatLatest, shouldScrollGroupChatToLatestOnEntry, GROUP_CHAT_SCROLL_TOP_THRESHOLD, type GroupChatScrollMetrics } from "./group-chat-scroll";
import type { GroupChatAttachment, GroupChatAttachmentType, GroupChatMember, GroupChatMessage, GroupChatMessageReadStatus, GroupChatReadSummary, GroupChatReactionSettings } from "./group-chat/group-chat.types";

type Props = {
  groupId: string;
  userScope: string;
  tenantScope: string;
  groupStatus: string | null;
  groupKind: string | null;
  memberDirectory: readonly GroupChatMember[];
  canPost: boolean | null;
  postingMuted: boolean | null;
  canHideMessages: boolean | null;
  canPinMessages: boolean | null;
  canReport: boolean | null;
  currentMemberKind: string | null;
  currentMemberStatus: string | null;
  lifecycleRefreshPending?: boolean;
  readStatusRefreshKey: number;
  reconnectRefreshKey: number;
  readThroughMessageId: string | null;
  conversationEntryKey?: number;
};

const messageKey = (groupId: string) => ["group-chat", "messages", groupId];
const pinnedKey = (groupId: string) => ["group-chat", "pinned", groupId];
const readStatusKey = (groupId: string, userScope: string, tenantScope: string, messageId: string) => `${userScope}:${tenantScope}:${groupId}:${messageId}`;
const READ_STATUS_AUTO_CONCURRENCY = 2;

type EditVariables = { groupId: string; messageId: string; content: string };
type MessageActionVariables = { groupId: string; messageId: string };
type HideVariables = MessageActionVariables & { reason: string };
type ReportVariables = MessageActionVariables & { reason: string; details: string };
type SendVariables = { content: string; replyToId?: string };
type AttachmentUploadVariables = { groupId: string; file: File; attachmentType: GroupChatAttachmentType };
type AttachmentSendVariables = { groupId: string; attachment: GroupChatAttachment };
type ReactionVariables = { groupId: string; messageId: string; emoji: string; remove: boolean };
type PinVariables = { groupId: string; messageId: string; pinned: boolean };

function formatMessageTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatMessageCompactTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getGroupChatAttachmentType(file: File): GroupChatAttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function getMessageAttachmentFileName(message: GroupChatMessage): string {
  return message.file_name?.trim() || message.filename?.trim() || message.attachment?.file_name?.trim() || message.attachment?.filename?.trim() || "Attachment";
}

function getMessageAttachmentType(message: GroupChatMessage): string {
  return message.attachment?.attachment_type?.trim().toLowerCase() || message.message_type.trim().toLowerCase();
}

function GroupChatAttachmentMessage({ message }: { message: GroupChatMessage }) {
  const attachmentId = message.attachment_id;
  const attachmentType = getMessageAttachmentType(message);
  const isImage = attachmentType === "image" || message.mime_type?.toLowerCase().startsWith("image/") || message.attachment?.mime_type?.toLowerCase().startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState(() => resolveGroupChatAttachmentMetadata(message));

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!attachmentId) return undefined;

    void downloadGroupChatAttachment(attachmentId).then((response) => {
      if (!active) return;
      setMetadata(resolveGroupChatAttachmentMetadata(message, response));
      if (!isImage) return;
      if (response.blob.size === 0) throw new Error("empty attachment");
      objectUrl = window.URL.createObjectURL(response.blob);
      setPreviewUrl(objectUrl);
    }).catch(() => {
      if (active && isImage) setPreviewError("Image preview unavailable");
    });

    return () => {
      active = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, isImage, message]);

  const openAttachment = async (download: boolean) => {
    if (!attachmentId) return;
    try {
      const response = await downloadGroupChatAttachment(attachmentId);
      setMetadata(resolveGroupChatAttachmentMetadata(message, response));
      const objectUrl = window.URL.createObjectURL(response.blob);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = response.fileName || getMessageAttachmentFileName(message);
        anchor.rel = "noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1500);
    } catch {
      setPreviewError("Attachment could not be opened right now");
    }
  };

  return <div className="mt-1 max-w-[320px] rounded-xl border border-[#d7e5df] bg-[#f8fbf9] p-2 text-[#16332b]">
    {isImage && previewUrl ? <img src={previewUrl} alt={getMessageAttachmentFileName(message)} className="max-h-56 w-full rounded-lg object-contain" onError={() => { setPreviewUrl(null); setPreviewError("Image preview unavailable"); }} /> : null}
    {isImage && !previewUrl && !previewError ? <p className="px-1 py-3 text-xs text-[#52736a]">Loading image preview...</p> : null}
    {previewError ? <p className="px-1 py-1 text-xs text-[#8f3b2f]">{previewError}</p> : null}
    <div className="mt-1 flex items-center justify-between gap-2">
      <div className="min-w-0"><p className="truncate text-xs font-semibold">{metadata.file_name}</p><p className="text-[11px] text-[#52736a]">{attachmentId ? formatGroupChatAttachmentSummary(metadata) : "File unavailable"}</p></div>
      <div className="flex shrink-0 gap-1.5"><button type="button" disabled={!attachmentId} onClick={() => void openAttachment(false)} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#1f6a58] shadow-sm disabled:opacity-50">Open</button><button type="button" disabled={!attachmentId} onClick={() => void openAttachment(true)} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#1f6a58] shadow-sm disabled:opacity-50">Download</button></div>
    </div>
    {message.content?.trim() ? <p className="mt-2 whitespace-pre-wrap break-words text-[13px]">{message.content}</p> : null}
  </div>;
}

type MessageAction = "reply" | "edit" | "retract" | "hide" | "report" | "pin" | "unpin" | "read-status";

function getPinnedMessagePreview(message: GroupChatMessage): string {
  if (message.status.trim().toLowerCase() !== "visible") return "Original message unavailable.";
  if (message.attachment_id) {
    const type = getMessageAttachmentType(message);
    return `${type.charAt(0).toUpperCase()}${type.slice(1)} attachment`;
  }
  return getGroupChatMessageDisplayText(message);
}

type ReactionControlsProps = {
  message: GroupChatMessage;
  settings: GroupChatReactionSettings | null;
  pickerOpen: boolean;
  mutationPending: boolean;
  onTogglePicker: () => void;
  onToggleReaction: (emoji: string) => void;
};

function GroupChatReactionControls({ message, settings, pickerOpen, mutationPending, onTogglePicker, onToggleReaction }: ReactionControlsProps) {
  const counts = normalizeGroupChatReactionCounts(message.reactions);
  const entries = Object.entries(counts);
  const canControl = settings?.enabled === true && settings.emojis.length > 0 && canReactToGroupChatMessage(message);
  if (message.status.trim().toLowerCase() !== "visible") return null;
  if (!canControl && entries.length === 0) return null;
  const selected = new Set(message.my_reactions);
  return <div className="mt-1 flex flex-wrap items-center gap-0.5" aria-label="Message reactions">
    {entries.map(([emoji, count]) => {
      const isSelected = selected.has(emoji);
      const canToggleExisting = canControl && (settings?.emojis.includes(emoji) || isSelected);
      return canToggleExisting ? <button key={emoji} type="button" disabled={mutationPending} aria-pressed={isSelected} onClick={() => onToggleReaction(emoji)} className={`rounded-full border px-1.5 py-0.5 text-[11px] transition ${isSelected ? "border-[#1f6a58] bg-[#d8f3e4] text-[#16332b]" : "border-[#d7e5df] bg-white/80 text-[#52736a]"} disabled:opacity-50`}>{emoji} {count}</button> : <span key={emoji} className="rounded-full border border-[#d7e5df] bg-white/70 px-1.5 py-0.5 text-[11px] text-[#52736a]">{emoji} {count}</span>;
    })}
    {canControl ? <div className="relative">
      <button type="button" aria-label="Add reaction" aria-expanded={pickerOpen} disabled={mutationPending} onClick={onTogglePicker} className="rounded-full border border-[#d7e5df] bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-[#52736a] hover:border-[#1f6a58] hover:text-[#1f6a58] disabled:opacity-50">+</button>
      {pickerOpen ? <div className="absolute bottom-7 left-0 z-20 flex max-w-56 flex-wrap gap-1 rounded-xl border border-[#d7e5df] bg-white p-2 shadow-lg" role="menu" aria-label="Available reactions">
        {settings.emojis.map((emoji) => { const isSelected = selected.has(emoji); return <button key={emoji} type="button" role="menuitem" aria-label={isSelected ? `Remove ${emoji} reaction` : `React with ${emoji}`} aria-pressed={isSelected} disabled={mutationPending} onClick={() => onToggleReaction(emoji)} className={`rounded-lg px-2 py-1 text-base hover:bg-[#e8f6ee] ${isSelected ? "bg-[#d8f3e4]" : ""}`}>{emoji}</button>; })}
      </div> : null}
    </div> : null}
  </div>;
}

type MessageBubbleProps = {
  message: GroupChatMessage;
  isOwnMessage: boolean;
  isFirstUnread: boolean;
  actions: readonly MessageAction[];
  menuOpen: boolean;
  pendingAction: MessageAction | null;
  editMode: boolean;
  editDraft: string;
  editError: string | null;
  hideReason: string;
  mutationPending: boolean;
  replyTarget: GroupChatMessage | null;
  highlighted: boolean;
  onToggleMenu: () => void;
  onSelectAction: (action: MessageAction) => void;
  onReplyReference: (messageId: string) => void;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onHideReasonChange: (value: string) => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  reactionSettings: GroupChatReactionSettings | null;
  reactionPickerOpen: boolean;
  reactionMutationPending: boolean;
  onToggleReactionPicker: () => void;
  onToggleReaction: (emoji: string) => void;
  readStatusEligible: boolean;
  readStatusOpen: boolean;
  readStatus: GroupChatMessageReadStatus | null;
  readSummary: GroupChatReadSummary | null;
  readStatusLoading: boolean;
  readStatusError: boolean;
  readStatusNames: readonly string[];
  onToggleReadStatus: () => void;
  onRetryReadStatus: () => void;
  onCloseReadStatus: () => void;
  messageRef?: (node: HTMLElement | null) => void;
};

function MessageBubble({ message, isOwnMessage, isFirstUnread, actions, menuOpen, pendingAction, editMode, editDraft, editError, hideReason, mutationPending, replyTarget, highlighted, onToggleMenu, onSelectAction, onReplyReference, onEditDraftChange, onSaveEdit, onCancelEdit, onHideReasonChange, onConfirmAction, onCancelAction, reactionSettings, reactionPickerOpen, reactionMutationPending, onToggleReactionPicker, onToggleReaction, readStatusEligible, readStatusOpen, readStatus, readSummary, readStatusLoading, readStatusError, readStatusNames, onToggleReadStatus, onRetryReadStatus, onCloseReadStatus, messageRef }: MessageBubbleProps) {
  const isSystemMessage = message.message_type.trim().toLowerCase() === "system";
  const status = message.status.trim().toLowerCase();
  const unavailable = status === "retracted" || status === "removed_by_admin";
  const readStatusTickState = readSummary ? getGroupChatReadSummaryTickState(readSummary) : getGroupChatReadStatusTickState(readStatus);
  const readStatusTick = readStatusTickState === "unknown" ? "·" : readStatusTickState === "single" ? "✓" : "✓✓";
  const readStatusTickClass = readStatusTickState === "double-blue" ? "text-[#7dd3fc]" : readStatusTickState === "double-neutral" ? "text-[#cbd5d1]" : readStatusTickState === "unknown" ? "text-[#9bb3aa]" : "text-[#d8f3e4]";
  const messageClasses = `max-w-[85%] rounded-2xl px-2.5 py-1.5 text-sm shadow-sm ${actions.length > 0 ? "pr-12" : ""} ${highlighted ? "ring-2 ring-[#f0b429]" : ""} ${isOwnMessage ? "bg-[#1f6a58] text-white" : "border border-[#e1ebe6] bg-white text-[#16332b]"}`;
  const menuLabel = pendingAction === "retract" ? "Retract this message?" : pendingAction === "hide" ? "Hide this message?" : pendingAction === "report" ? "Report this message?" : null;
  return <div className="group">
    {isFirstUnread ? <div className="my-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#1f6a58]"><span className="h-px flex-1 bg-[#b7dfc7]" />Unread messages<span className="h-px flex-1 bg-[#b7dfc7]" /></div> : null}
    {isSystemMessage ? <div className="flex justify-center py-0.5">
      <article className="inline-flex max-w-[90%] items-center gap-2 rounded-full bg-[#e8f6ee] px-3 py-1 text-center text-xs text-[#52736a] shadow-sm">
        <p className={unavailable ? "italic opacity-80" : "break-words"}>{getGroupChatMessageDisplayText(message)}</p>
        <time className="shrink-0 text-[10px] text-[#7f9d94]" dateTime={message.created_at} title={formatMessageTime(message.created_at)} aria-label={`Sent ${formatMessageTime(message.created_at)}`}>{formatMessageCompactTime(message.created_at)}</time>
      </article>
    </div> : null}
    {!isSystemMessage ? <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <article ref={messageRef} data-group-message-id={message.id} className={`relative ${messageClasses}`}>
        {actions.length > 0 ? <div className="absolute right-1 top-1 z-10">
          <button type="button" aria-label={`Message actions for ${message.sender_name}`} aria-haspopup="menu" aria-expanded={menuOpen} title="Message actions" disabled={mutationPending} onClick={onToggleMenu} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#52736a] opacity-75 shadow-sm transition-opacity hover:bg-white hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 18 6" className="h-2.5 w-4" fill="currentColor"><circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" /><circle cx="15" cy="3" r="1.5" /></svg></button>
          {menuOpen ? <div role="menu" aria-label="Message actions" className={`absolute ${isOwnMessage ? "right-0" : "left-0"} top-8 z-30 w-56 rounded-xl border border-[#d7e5df] bg-white p-2 text-sm text-[#16332b] shadow-lg`}>
            {pendingAction === null ? actions.map((action) => <button key={action} type="button" role="menuitem" onClick={() => onSelectAction(action)} className="block w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-[#e8f6ee] focus-visible:bg-[#e8f6ee] focus-visible:outline-none">{action === "reply" ? "Reply to message" : action === "edit" ? "Edit message" : action === "retract" ? "Retract message" : action === "hide" ? "Hide message" : action === "report" ? "Report message" : action === "pin" ? "Pin message" : action === "unpin" ? "Unpin message" : "Read status"}</button>) : <div>
              <p className="px-2 py-1 font-semibold">{menuLabel}</p>
              {pendingAction === "retract" ? <p className="px-2 py-1 text-xs text-[#52736a]">The original message will remain available for audit and will no longer be visible here.</p> : pendingAction === "report" ? <label className="mt-2 block px-2 text-xs font-semibold text-[#52736a]">Reason<select required value={hideReason} onChange={(event) => onHideReasonChange(event.target.value)} disabled={mutationPending} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-sm font-normal text-[#16332b] outline-none focus:border-[#1f6a58]"><option value="">Select a reason</option>{GROUP_CHAT_REPORT_REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : <label className="mt-2 block px-2 text-xs font-semibold text-[#52736a]">Reason<textarea value={hideReason} maxLength={255} onChange={(event) => onHideReasonChange(event.target.value)} disabled={mutationPending} className="mt-1 min-h-20 w-full rounded-lg border border-[#d7e5df] p-2 text-sm font-normal text-[#16332b] outline-none focus:border-[#1f6a58]" /></label>}
              <div className="mt-2 flex gap-2 px-2 pb-1"><button type="button" disabled={mutationPending || ((pendingAction === "hide" || pendingAction === "report") && !hideReason.trim())} onClick={onConfirmAction} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{mutationPending ? pendingAction === "retract" ? "Retracting..." : pendingAction === "hide" ? "Hiding..." : "Submitting..." : "Confirm"}</button><button type="button" disabled={mutationPending} onClick={onCancelAction} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button></div>
            </div>}
          </div> : null}
        </div> : null}
        <div className={`mb-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-4 ${isOwnMessage ? "text-[#d8f3e4]" : "text-[#7f9d94]"}`}>
          <span className="min-w-0 truncate font-semibold">{message.sender_name}</span>
          {message.is_edited ? <span className="shrink-0 italic">Edited</span> : null}
          {message.pinned && !unavailable ? <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isOwnMessage ? "bg-[#d8f3e4] text-[#16332b]" : "bg-[#e8f6ee] text-[#1f6a58]"}`}>Pinned</span> : null}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <time dateTime={message.created_at} title={formatMessageTime(message.created_at)} aria-label={`Sent ${formatMessageTime(message.created_at)}`}>{formatMessageCompactTime(message.created_at)}</time>
            {readStatusEligible && (readStatus || readSummary) ? <button type="button" aria-label="View message info" title={`View message info. Sent ${formatMessageTime(message.created_at)}`} aria-expanded={readStatusOpen} onClick={onToggleReadStatus} className={`rounded px-0.5 text-[14px] font-bold leading-none transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8f3e4] ${readStatusTickClass}`}>{readStatusTick}</button> : null}
          </span>
        </div>
        {!unavailable && message.reply_to ? <div className={`mb-1.5 border-l-2 pl-2 text-xs ${isOwnMessage ? "border-[#d8f3e4] text-[#e5f8eb]" : "border-[#8ccaa2] text-[#52736a]"}`}>
          {replyTarget ? <button type="button" onClick={() => onReplyReference(message.reply_to!.id)} className="block max-w-full text-left hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8f3e4]"><span className={`block truncate font-semibold ${isOwnMessage ? "text-white" : "text-[#1f6a58]"}`}>{message.reply_to.sender_name}</span><span className="block truncate">{getGroupChatReplyReferencePreview(message.reply_to, replyTarget)}</span></button> : <div><span className={`block truncate font-semibold ${isOwnMessage ? "text-white" : "text-[#1f6a58]"}`}>{message.reply_to.sender_name}</span><span className="block truncate">{getGroupChatReplyReferencePreview(message.reply_to)}</span></div>}
        </div> : null}
        {editMode ? <div><label className="sr-only" htmlFor={`edit-group-message-${message.id}`}>Edit message</label><textarea id={`edit-group-message-${message.id}`} value={editDraft} onChange={(event) => onEditDraftChange(event.target.value)} disabled={mutationPending} className="min-h-20 w-full resize-y rounded-lg border border-[#b7dfc7] bg-white p-2 text-sm text-[#16332b] outline-none focus:border-[#1f6a58]" />{editError ? <p className="mt-1 text-xs text-[#b42318]" role="alert">{editError}</p> : null}<div className="mt-2 flex gap-2"><button type="button" disabled={mutationPending || !editDraft.trim()} onClick={onSaveEdit} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{mutationPending ? "Saving..." : "Save"}</button><button type="button" disabled={mutationPending} onClick={onCancelEdit} className="rounded-full border border-white/70 px-3 py-1.5 text-xs font-semibold text-current">Cancel</button></div></div> : unavailable ? <p className="italic opacity-80">{getGroupChatMessageDisplayText(message)}</p> : message.attachment_id ? <GroupChatAttachmentMessage message={message} /> : <div className="flex flex-wrap items-end gap-x-1.5 gap-y-1"><p className="min-w-0 flex-[1_1_auto] whitespace-pre-wrap break-words">{getGroupChatMessageDisplayText(message)}</p><GroupChatReactionControls message={message} settings={reactionSettings} pickerOpen={reactionPickerOpen} mutationPending={reactionMutationPending} onTogglePicker={onToggleReactionPicker} onToggleReaction={onToggleReaction} /></div>}
        {editMode || unavailable || message.attachment_id ? <GroupChatReactionControls message={message} settings={reactionSettings} pickerOpen={reactionPickerOpen} mutationPending={reactionMutationPending} onTogglePicker={onToggleReactionPicker} onToggleReaction={onToggleReaction} /> : null}
        {readStatusOpen ? <div className="absolute right-2 top-full z-20 mt-1 w-64 rounded-xl border border-[#d7e5df] bg-white p-3 text-left text-[#16332b] shadow-lg" aria-label="Read status">
          <div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-[#52736a]">Read status</p><button type="button" aria-label="Close read status" onClick={onCloseReadStatus} className="rounded-full px-1 text-sm text-[#52736a] hover:bg-[#e8f6ee]">×</button></div>
          {readSummary ? <div className="mt-2 text-sm"><p className="font-semibold">{readSummary.all_read ? "Read by all recipients" : "Not read by all recipients"}</p><p className="text-xs text-[#52736a]">{readSummary.read_count} of {readSummary.recipient_count} recipients seen</p></div> : readStatusLoading && !readStatus ? <p className="mt-2 text-sm text-[#52736a]">Loading read status...</p> : readStatus ? <div className="mt-2 text-sm">{readStatusError ? <p className="mb-1 text-xs text-[#7a271a]" role="alert">Unable to refresh read status. Showing the last confirmed status.</p> : null}<p className="font-semibold">{readStatus.label}</p><p className="text-xs text-[#52736a]">{readStatus.seen_by_count} of {readStatus.recipient_count} recipients seen</p>{readStatusNames.length > 0 ? <p className="mt-1 text-xs text-[#52736a]">Seen by: {readStatusNames.join(", ")}</p> : readStatus.seen_by_count === 0 ? <p className="mt-1 text-xs text-[#52736a]">No members have seen this message yet.</p> : <p className="mt-1 text-xs text-[#52736a]">Seen-by member names unavailable.</p>}</div> : readStatusError ? <div className="mt-2 text-sm text-[#7a271a]" role="alert"><p>Read status is unavailable for this message.</p><button type="button" onClick={onRetryReadStatus} className="mt-1 font-semibold underline">Try again</button></div> : null}
        </div> : null}
      </article>
    </div> : null}
  </div>;
}

/** Renders REST-only Group Chat history and text messaging without using Direct Chat or Socket.IO. */
export default function GroupChatMessages({ groupId, userScope, tenantScope, groupStatus, groupKind, memberDirectory, canPost, postingMuted, canHideMessages, canPinMessages, canReport, currentMemberKind, currentMemberStatus, lifecycleRefreshPending = false, readStatusRefreshKey, reconnectRefreshKey, readThroughMessageId, conversationEntryKey = 0 }: Props) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [readError, setReadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const initialScrollDone = useRef(false);
  const scrollToBottomOnNextUpdate = useRef(false);
  const previousScroll = useRef<{ height: number; top: number } | null>(null);
  const wasNearBottom = useRef(true);
  const renderedNewestMessageId = useRef<string | null>(null);
  const handledConversationEntryKey = useRef(0);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const replyHighlightTimer = useRef<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ messageId: string; action: "retract" | "hide" | "report" } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<GroupChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<GroupChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [openReactionPickerId, setOpenReactionPickerId] = useState<string | null>(null);
  const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false);
  const [readStatusSelection, setReadStatusSelection] = useState<{ groupId: string; messageId: string } | null>(null);
  const [readStatusByMessage, setReadStatusByMessage] = useState<Record<string, GroupChatMessageReadStatus>>({});
  const readStatusQueueRef = useRef<string[]>([]);
  const readStatusInFlightRef = useRef(new Set<string>());
  const readStatusByMessageRef = useRef<Record<string, GroupChatMessageReadStatus>>({});
  const readStatusElementsRef = useRef(new Map<string, HTMLElement>());
  const readStatusObserverRef = useRef<IntersectionObserver | null>(null);
  const readStatusAbortRef = useRef<AbortController | null>(null);
  const readStatusGenerationRef = useRef(0);
  const readStatusReconciliationStateRef = useRef<GroupChatReadReconciliationState>("pending");
  const readStatusRefreshPendingRef = useRef(false);
  const handledReconnectRefreshKey = useRef(reconnectRefreshKey);
  const markReadInFlightRef = useRef<Promise<void> | null>(null);
  const currentGroupIdRef = useRef(groupId);
  const processReadStatusQueueRef = useRef<() => void>(() => undefined);
  const queueReadStatusRef = useRef<(messageId: string, forceRefresh?: boolean) => boolean>(() => false);
  currentGroupIdRef.current = groupId;
  readStatusByMessageRef.current = readStatusByMessage;
  const groupIsClosed = groupStatus?.trim().toLowerCase() === "closed";
  const postingRestriction = getGroupChatPostingRestrictionState(groupStatus, canPost, postingMuted, lifecycleRefreshPending);
  const effectiveCanPost = postingRestriction.blocked ? false : canPost;
  const historyQuery = useInfiniteQuery({
    queryKey: messageKey(groupId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => listGroupChatMessages(groupId, { limit: 50, ...(pageParam ? { cursor: pageParam } : {}), signal }),
    getNextPageParam: (lastPage) => lastPage.has_more && lastPage.next_cursor ? lastPage.next_cursor : undefined,
    retry: false,
  });
  const reactionQuery = useQuery({
    queryKey: ["group-chat", "reactions", groupId],
    queryFn: ({ signal }) => getGroupChatReactions(groupId, signal),
    enabled: Boolean(groupId.trim()),
    retry: false,
  });
  const pinnedQuery = useQuery({
    queryKey: pinnedKey(groupId),
    queryFn: ({ signal }) => listGroupChatPinnedMessages(groupId, signal),
    enabled: Boolean(groupId.trim()),
    retry: false,
  });
  const pages = historyQuery.data?.pages ?? [];
  const messages = mergeGroupChatMessagePages(pages);
  const firstUnreadMessageId = pages.map((page) => page.first_unread_message_id).find((value): value is string => Boolean(value)) ?? null;
  const readStatusMessageId = readStatusSelection?.groupId === groupId ? readStatusSelection.messageId : null;
  const selectedReadStatusMessage = readStatusMessageId ? messages.find((message) => message.id === readStatusMessageId) ?? null : null;
  const readStatusAllowed = selectedReadStatusMessage ? canViewGroupChatReadStatus(selectedReadStatusMessage, groupKind, currentMemberKind, currentMemberStatus) : false;
  const readStatusQuery = useQuery({
    queryKey: groupChatReadStatusQueryKey(groupId, userScope, tenantScope, readStatusMessageId ?? ""),
    queryFn: ({ signal }) => getGroupChatMessageReadStatus(groupId, readStatusMessageId!, signal),
    enabled: Boolean(readStatusMessageId && readStatusAllowed && !selectedReadStatusMessage?.read_summary),
    staleTime: 5000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const processReadStatusQueue = useCallback(() => {
    const generation = readStatusGenerationRef.current;
    const signal = readStatusAbortRef.current?.signal;
    if (!shouldQueueGroupChatReadStatuses(readStatusReconciliationStateRef.current) || !signal || signal.aborted || currentGroupIdRef.current !== groupId) return;
    while (readStatusInFlightRef.current.size < READ_STATUS_AUTO_CONCURRENCY && readStatusQueueRef.current.length > 0) {
      const messageId = readStatusQueueRef.current.shift();
      if (!messageId) continue;
      const cacheKey = readStatusKey(groupId, userScope, tenantScope, messageId);
      if (readStatusByMessageRef.current[cacheKey] || readStatusInFlightRef.current.has(cacheKey)) continue;
      readStatusInFlightRef.current.add(cacheKey);
      void getGroupChatMessageReadStatus(groupId, messageId, signal).then((status) => {
        if (generation !== readStatusGenerationRef.current || currentGroupIdRef.current !== groupId || status.message_id !== messageId) return;
        queryClient.setQueryData(groupChatReadStatusQueryKey(groupId, userScope, tenantScope, messageId), status);
        setReadStatusByMessage((current) => {
          const next = mergeGroupChatReadStatusCache(current, cacheKey, status);
          readStatusByMessageRef.current = next;
          return next;
        });
      }).catch(() => {
        // Background status failures leave the indicator neutral and are surfaced on demand.
      }).finally(() => {
        if (generation !== readStatusGenerationRef.current) return;
        readStatusInFlightRef.current.delete(cacheKey);
        processReadStatusQueueRef.current();
      });
    }
  }, [groupId, queryClient, tenantScope, userScope]);
  processReadStatusQueueRef.current = processReadStatusQueue;
  const queueReadStatus = useCallback((messageId: string, forceRefresh = false): boolean => {
    if (!shouldQueueGroupChatReadStatuses(readStatusReconciliationStateRef.current)) return false;
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message || !canShowGroupChatReadStatusIndicator(message, userId, groupKind, currentMemberKind, currentMemberStatus)) return false;
    if (!shouldFetchGroupChatMessageReadStatus(message.read_summary)) return false;
    if (readStatusSelection?.groupId === groupId && readStatusSelection.messageId === messageId) return false;
    const cacheKey = readStatusKey(groupId, userScope, tenantScope, messageId);
    const statusQueryKey = groupChatReadStatusQueryKey(groupId, userScope, tenantScope, messageId);
    const cachedStatus = readStatusByMessageRef.current[cacheKey] ?? queryClient.getQueryData<GroupChatMessageReadStatus>(statusQueryKey);
    const statusQueryInvalidated = queryClient.getQueryState(statusQueryKey)?.isInvalidated === true;
    if ((!forceRefresh && cachedStatus && !statusQueryInvalidated) || readStatusInFlightRef.current.has(cacheKey) || readStatusQueueRef.current.includes(messageId)) return false;
    readStatusQueueRef.current.push(messageId);
    processReadStatusQueueRef.current();
    return true;
  }, [currentMemberKind, currentMemberStatus, groupId, groupKind, messages, queryClient, readStatusSelection, tenantScope, userId, userScope]);
  queueReadStatusRef.current = queueReadStatus;
  const sendMutation = useMutation({
    mutationFn: ({ content, replyToId }: SendVariables) => sendGroupChatTextMessage(groupId, content, replyToId),
    retry: false,
    onSuccess: async () => {
      setDraft("");
      setReplyingTo(null);
      scrollToBottomOnNextUpdate.current = true;
      await queryClient.invalidateQueries({ queryKey: messageKey(groupId) });
    },
  });
  const attachmentUploadMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, file, attachmentType }: AttachmentUploadVariables) => uploadGroupChatAttachment(targetGroupId, file, attachmentType),
    retry: false,
    onSuccess: (attachment, variables) => {
      if (variables.groupId !== groupId) return;
      setPendingAttachment(attachment);
      setAttachmentError(null);
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) {
        setPendingAttachment(null);
        setAttachmentError(error.message);
      }
    },
  });
  const attachmentSendMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, attachment }: AttachmentSendVariables) => sendGroupChatAttachmentMessage(targetGroupId, attachment.attachment_type, attachment.id),
    retry: false,
    onSuccess: async (_message, variables) => {
      if (variables.groupId !== groupId) return;
      setAttachmentFile(null);
      setPendingAttachment(null);
      setAttachmentError(null);
      scrollToBottomOnNextUpdate.current = true;
      await queryClient.invalidateQueries({ queryKey: messageKey(groupId) });
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) setAttachmentError(`Attachment uploaded, but the message could not be sent: ${error.message}`);
    },
  });
  const refreshMessages = async () => {
    await queryClient.invalidateQueries({ queryKey: messageKey(groupId) });
  };
  const editMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, messageId, content }: EditVariables) => editGroupChatMessage(targetGroupId, messageId, content),
    retry: false,
    onSuccess: async (_message, variables) => {
      if (variables.groupId !== groupId) return;
      setEditingMessageId(null);
      setEditDraft("");
      setEditError(null);
      setActionError(null);
      await refreshMessages();
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) setEditError(error.message);
    },
  });
  const retractMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, messageId }: MessageActionVariables) => retractGroupChatMessage(targetGroupId, messageId),
    retry: false,
    onSuccess: async (_message, variables) => {
      if (variables.groupId !== groupId) return;
      setOpenMenuId(null);
      setPendingAction(null);
      setActionError(null);
      await refreshMessages();
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) setActionError(error.message);
    },
  });
  const hideMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, messageId, reason }: HideVariables) => hideGroupChatMessage(targetGroupId, messageId, reason),
    retry: false,
    onSuccess: async (_message, variables) => {
      if (variables.groupId !== groupId) return;
      setOpenMenuId(null);
      setPendingAction(null);
      setHideReason("");
      setActionError(null);
      await refreshMessages();
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) setActionError(error.message);
    },
  });
  const reportMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, messageId, reason, details }: ReportVariables) => {
      const payload = buildGroupChatReportPayload(messageId, reason, details);
      if (!payload) throw new Error("A non-empty report reason is required.");
      return createGroupChatReport(targetGroupId, payload);
    },
    retry: false,
    onSuccess: (_report, variables) => {
      if (variables.groupId !== groupId) return;
      setOpenMenuId(null);
      setPendingAction(null);
      setHideReason("");
      setActionError("Report submitted. It has not been resolved yet.");
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) setActionError(error.message);
    },
  });
  const reactionMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, messageId, emoji, remove }: ReactionVariables) => remove ? removeGroupChatMessageReaction(targetGroupId, messageId, emoji) : addGroupChatMessageReaction(targetGroupId, messageId, emoji),
    retry: false,
    onSuccess: async (_result, variables) => {
      if (variables.groupId !== groupId) return;
      setOpenReactionPickerId(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: messageKey(groupId) });
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) setActionError(`Unable to update reaction: ${error.message}`);
    },
  });
  const pinMutation = useMutation({
    mutationFn: ({ groupId: targetGroupId, messageId, pinned }: PinVariables) => pinned ? pinGroupChatMessage(targetGroupId, messageId) : unpinGroupChatMessage(targetGroupId, messageId),
    retry: false,
    onSuccess: async (_message, variables) => {
      if (variables.groupId !== groupId) return;
      setOpenMenuId(null);
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKey(groupId) }),
        queryClient.invalidateQueries({ queryKey: pinnedKey(groupId) }),
      ]);
    },
    onError: (error: Error, variables) => {
      if (variables.groupId === groupId) setActionError(`Unable to ${variables.pinned ? "pin" : "unpin"} message: ${error.message}`);
    },
  });
  const hasLoadedHistory = pages.length > 0;

  const reconcileActiveGroupRead = useCallback(() => {
    if (markReadInFlightRef.current) return markReadInFlightRef.current;
    const request = reconcileGroupChatReadState(groupId, markGroupChatRead, (queryKey) => queryClient.invalidateQueries({ queryKey }), userScope, tenantScope);
    markReadInFlightRef.current = request;
    void request.then(() => undefined, () => undefined).finally(() => {
      if (markReadInFlightRef.current === request) markReadInFlightRef.current = null;
    });
    return request;
  }, [groupId, queryClient, tenantScope, userScope]);

  useEffect(() => {
    readStatusReconciliationStateRef.current = "pending";
    readStatusAbortRef.current?.abort();
    readStatusAbortRef.current = new AbortController();
    readStatusGenerationRef.current += 1;
    readStatusQueueRef.current = [];
    readStatusInFlightRef.current.clear();
    readStatusElementsRef.current.clear();
    readStatusObserverRef.current?.disconnect();
    readStatusObserverRef.current = null;
    readStatusRefreshPendingRef.current = false;
    readStatusByMessageRef.current = {};
    initialScrollDone.current = false;
    scrollToBottomOnNextUpdate.current = false;
    previousScroll.current = null;
    wasNearBottom.current = true;
    renderedNewestMessageId.current = null;
    setShowJumpToLatest(false);
    setDraft("");
    setReadError(null);
    setOpenMenuId(null);
    setPendingAction(null);
    setEditingMessageId(null);
    setEditDraft("");
    setEditError(null);
    setHideReason("");
    setActionError(null);
    setAttachmentFile(null);
    setPendingAttachment(null);
    setAttachmentError(null);
    setReplyingTo(null);
    setHighlightedMessageId(null);
    setOpenReactionPickerId(null);
    setPinnedPanelOpen(false);
    setReadStatusSelection(null);
    setReadStatusByMessage({});
    attachmentUploadMutation.reset();
    attachmentSendMutation.reset();
    reactionMutation.reset();
    pinMutation.reset();
    return () => {
      readStatusAbortRef.current?.abort();
      readStatusGenerationRef.current += 1;
    };
  }, [groupId]);

  const registerReadStatusElement = useCallback((messageId: string, node: HTMLElement | null) => {
    const previous = readStatusElementsRef.current.get(messageId);
    if (previous && previous !== node) readStatusObserverRef.current?.unobserve(previous);
    if (node) {
      readStatusElementsRef.current.set(messageId, node);
      readStatusObserverRef.current?.observe(node);
    } else {
      readStatusElementsRef.current.delete(messageId);
    }
  }, []);

  const queueVisibleReadStatuses = useCallback((forceRefresh = false, boundaryMessageIds?: ReadonlySet<string>) => {
    const root = scrollRef.current;
    if (!root) return;
    const refreshVisibleStatuses = shouldForceGroupChatReadStatusRefresh(forceRefresh, readStatusRefreshPendingRef.current);
    let queuedVisibleStatus = false;
    root.querySelectorAll<HTMLElement>("[data-group-message-id]").forEach((node) => {
      const messageId = node.dataset.groupMessageId;
      if (messageId) readStatusElementsRef.current.set(messageId, node);
    });
    const rootRect = root.getBoundingClientRect();
    readStatusElementsRef.current.forEach((node, messageId) => {
      const rect = node.getBoundingClientRect();
      const withinVerticalMargin = rect.bottom >= rootRect.top - 80 && rect.top <= rootRect.bottom + 80;
      const withinHorizontalMargin = rect.right >= rootRect.left - 80 && rect.left <= rootRect.right + 80;
      if (withinVerticalMargin && withinHorizontalMargin && (!boundaryMessageIds || boundaryMessageIds.has(messageId.toLowerCase()))) queuedVisibleStatus = queueReadStatusRef.current(messageId, refreshVisibleStatuses) || queuedVisibleStatus;
    });
    if (queuedVisibleStatus) readStatusRefreshPendingRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const messageId = (entry.target as HTMLElement).dataset.groupMessageId;
        if (messageId) queueReadStatusRef.current(messageId);
      });
    }, { root: scrollRef.current, rootMargin: "80px" });
    readStatusObserverRef.current = observer;
    readStatusElementsRef.current.forEach((node) => observer.observe(node));
    const frameId = window.requestAnimationFrame(() => {
      // Seed the initial viewport after history rendering and the initial scroll have settled.
      queueVisibleReadStatuses();
    });
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      if (readStatusObserverRef.current === observer) readStatusObserverRef.current = null;
    };
  }, [currentMemberKind, currentMemberStatus, groupId, groupKind, messages.length, queueVisibleReadStatuses, userId]);

  useEffect(() => {
    if (canSendGroupChatMessage(groupStatus, effectiveCanPost, postingMuted === true)) return;
    setReplyingTo(null);
  }, [effectiveCanPost, groupStatus, postingMuted]);

  useEffect(() => {
    if (readStatusSelection?.groupId === groupId && (!selectedReadStatusMessage || !readStatusAllowed)) setReadStatusSelection(null);
  }, [groupId, readStatusAllowed, readStatusSelection, selectedReadStatusMessage]);

  useEffect(() => {
    if (readStatusRefreshKey <= 0) return undefined;
    readStatusRefreshPendingRef.current = true;
    readStatusAbortRef.current?.abort();
    readStatusAbortRef.current = new AbortController();
    readStatusGenerationRef.current += 1;
    readStatusQueueRef.current = [];
    readStatusInFlightRef.current.clear();
    void queryClient.invalidateQueries({ queryKey: groupChatReadStatusQueryKey(groupId, userScope, tenantScope) });
    const readThroughBoundary = resolveGroupChatReadThroughBoundary(messages, readThroughMessageId);
    const boundaryMessageIds = readThroughBoundary.loaded ? new Set(readThroughBoundary.messageIds.map((messageId) => messageId.toLowerCase())) : undefined;
    const frameId = window.requestAnimationFrame(() => queueVisibleReadStatuses(true, boundaryMessageIds));
    return () => window.cancelAnimationFrame(frameId);
  }, [groupId, messages, queryClient, queueVisibleReadStatuses, readStatusAllowed, readStatusMessageId, readStatusRefreshKey, readThroughMessageId, tenantScope, userScope]);

  useEffect(() => {
    if (!readStatusSelection || readStatusSelection.groupId !== groupId || !readStatusQuery.data || readStatusQuery.data.message_id !== readStatusSelection.messageId) return;
    const cacheKey = readStatusKey(groupId, userScope, tenantScope, readStatusSelection.messageId);
    setReadStatusByMessage((current) => current[cacheKey] === readStatusQuery.data ? current : mergeGroupChatReadStatusCache(current, cacheKey, readStatusQuery.data));
  }, [groupId, readStatusQuery.data, readStatusSelection, tenantScope, userScope]);

  useEffect(() => () => {
    if (replyHighlightTimer.current !== null) window.clearTimeout(replyHighlightTimer.current);
  }, []);

  useEffect(() => {
    if (!attachmentFile || !attachmentFile.type.startsWith("image/")) {
      setAttachmentPreviewUrl(null);
      return undefined;
    }
    const objectUrl = window.URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(objectUrl);
    return () => window.URL.revokeObjectURL(objectUrl);
  }, [attachmentFile]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
        setPendingAction(null);
        setHideReason("");
        setActionError(null);
      }
    };
    document.addEventListener("keydown", closeMenu);
    return () => document.removeEventListener("keydown", closeMenu);
  }, [openMenuId]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return;
    const maxHeight = 128;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
    node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  const loadOlder = useCallback(() => {
    const node = scrollRef.current;
    if (!node || !historyQuery.hasNextPage || historyQuery.isFetchingNextPage) return;
    previousScroll.current = { height: node.scrollHeight, top: node.scrollTop };
    void historyQuery.fetchNextPage();
  }, [historyQuery]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const metrics: GroupChatScrollMetrics = { scrollHeight: node.scrollHeight, scrollTop: node.scrollTop, clientHeight: node.clientHeight };
    const nearBottom = isGroupChatNearBottom(metrics);
    wasNearBottom.current = nearBottom;
    setShowJumpToLatest(!nearBottom && node.scrollHeight > node.clientHeight);
    if (node.scrollTop <= GROUP_CHAT_SCROLL_TOP_THRESHOLD) loadOlder();
  }, [loadOlder]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || messages.length === 0) return;
    const newestMessageId = messages[messages.length - 1]?.id ?? null;
    const newestMessageChanged = renderedNewestMessageId.current !== null && renderedNewestMessageId.current !== newestMessageId;
    if (scrollToBottomOnNextUpdate.current) {
      node.scrollTop = node.scrollHeight;
      scrollToBottomOnNextUpdate.current = false;
      previousScroll.current = null;
    } else if (previousScroll.current) {
      const previous = previousScroll.current;
      node.scrollTop = getGroupChatScrollTopAfterPrepend(previous.height, previous.top, node.scrollHeight);
      previousScroll.current = null;
    } else if (shouldFollowGroupChatLatest({ initial: !initialScrollDone.current, newestMessageChanged, userWasNearBottom: wasNearBottom.current, explicitLatestRequest: false })) {
      node.scrollTop = node.scrollHeight;
      wasNearBottom.current = true;
    }
    renderedNewestMessageId.current = newestMessageId;
    initialScrollDone.current = true;
    setShowJumpToLatest(!isGroupChatNearBottom({ scrollHeight: node.scrollHeight, scrollTop: node.scrollTop, clientHeight: node.clientHeight }) && node.scrollHeight > node.clientHeight);
  }, [historyQuery.data, messages.length]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    const entryRequested = conversationEntryKey > handledConversationEntryKey.current;
    if (!node || !shouldScrollGroupChatToLatestOnEntry(entryRequested, messages.length > 0)) return;
    node.scrollTop = node.scrollHeight;
    handledConversationEntryKey.current = conversationEntryKey;
    previousScroll.current = null;
    wasNearBottom.current = true;
    setShowJumpToLatest(false);
  }, [conversationEntryKey, messages.length]);

  useEffect(() => {
    if (!hasLoadedHistory) return;
    let active = true;
    const reconciliationApplies = !groupIsClosed && currentMemberStatus?.trim().toLowerCase() === "active";
    readStatusAbortRef.current?.abort();
    readStatusAbortRef.current = new AbortController();
    readStatusGenerationRef.current += 1;
    readStatusQueueRef.current = [];
    readStatusInFlightRef.current.clear();
    readStatusReconciliationStateRef.current = reconciliationApplies ? "pending" : "ready";
    if (!reconciliationApplies) {
      queueVisibleReadStatuses();
      return () => { active = false; };
    }
    void reconcileActiveGroupRead().then(() => {
      if (!active) return;
      readStatusReconciliationStateRef.current = "ready";
      setReadError(null);
      queueVisibleReadStatuses(true);
    }).catch((error: unknown) => {
      if (!active) return;
      readStatusReconciliationStateRef.current = "ready";
      setReadError(error instanceof Error ? error.message : "Unable to mark Group Chat messages as read.");
      queueVisibleReadStatuses(true);
    });
    return () => { active = false; };
  }, [currentMemberStatus, groupIsClosed, hasLoadedHistory, queueVisibleReadStatuses, reconcileActiveGroupRead]);

  useEffect(() => {
    const previousReconnectRefreshKey = handledReconnectRefreshKey.current;
    handledReconnectRefreshKey.current = Math.max(previousReconnectRefreshKey, reconnectRefreshKey);
    const activeMember = !groupIsClosed && currentMemberStatus?.trim().toLowerCase() === "active";
    if (!shouldReconcileGroupChatReadAfterReconnect(reconnectRefreshKey, previousReconnectRefreshKey, pages[0]?.unread_count, activeMember)) return undefined;
    let active = true;
    void reconcileActiveGroupRead().then(() => {
      if (active) setReadError(null);
    }).catch((error: unknown) => {
      if (active) setReadError(error instanceof Error ? error.message : "Unable to mark Group Chat messages as read after reconnect.");
    });
    return () => { active = false; };
  }, [currentMemberStatus, groupIsClosed, pages, reconnectRefreshKey, reconcileActiveGroupRead]);

  const jumpToLatest = () => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    wasNearBottom.current = true;
    setShowJumpToLatest(false);
  };

  const locateReplyTarget = (messageId: string) => {
    if (!messages.some((message) => message.id === messageId)) return;
    const target = Array.from(scrollRef.current?.querySelectorAll<HTMLElement>("[data-group-message-id]") ?? []).find((element) => element.dataset.groupMessageId === messageId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    if (replyHighlightTimer.current !== null) window.clearTimeout(replyHighlightTimer.current);
    replyHighlightTimer.current = window.setTimeout(() => setHighlightedMessageId(null), 1800);
  };
  const clearAttachment = () => {
    setAttachmentFile(null);
    setPendingAttachment(null);
    setAttachmentError(null);
    attachmentUploadMutation.reset();
    attachmentSendMutation.reset();
  };

  const handleAttachmentSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!canSendGroupChatMessage(groupStatus, effectiveCanPost, postingMuted === true)) {
      setAttachmentError(postingRestriction.message ?? "Attachments are unavailable in this group.");
      return;
    }
    const attachmentType = getGroupChatAttachmentType(file);
    setAttachmentFile(file);
    setPendingAttachment(null);
    setAttachmentError(null);
    attachmentUploadMutation.mutate({ groupId, file, attachmentType });
  };

  const retryAttachmentUpload = () => {
    if (!attachmentFile || !canSendGroupChatMessage(groupStatus, effectiveCanPost, postingMuted === true)) return;
    setAttachmentError(null);
    attachmentUploadMutation.mutate({ groupId, file: attachmentFile, attachmentType: getGroupChatAttachmentType(attachmentFile) });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || groupIsClosed || effectiveCanPost !== true || postingMuted === true) return;
    if (pendingAttachment) {
      attachmentSendMutation.mutate({ groupId, attachment: pendingAttachment });
      return;
    }
    if (!draft.trim()) return;
    sendMutation.mutate({ content: draft, replyToId: replyingTo?.id });
  };
  const postingDisabled = !canSendGroupChatMessage(groupStatus, effectiveCanPost, postingMuted === true);
  const restrictionMessage = postingRestriction.message;
  const mutationPending = editMutation.isPending || retractMutation.isPending || hideMutation.isPending || reportMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || pinMutation.isPending;
  const reactionSettings = reactionQuery.data ?? null;
  const reactionMutationPending = reactionMutation.isPending;
  const toggleReaction = (message: GroupChatMessage, emoji: string) => {
    if (!reactionSettings?.enabled || !reactionSettings.emojis.includes(emoji) || !canReactToGroupChatMessage(message) || reactionMutation.isPending) return;
    reactionMutation.mutate({ groupId, messageId: message.id, emoji, remove: isGroupChatReactionSelected(message, emoji) });
  };
  const pinnedMessages = pinnedQuery.data?.items ?? [];
  const pinnedCount = pages[0]?.pinned_count ?? pinnedQuery.data?.pinned_count ?? 0;
  const getMessageActions = (message: GroupChatMessage): readonly MessageAction[] => {
    const actions: MessageAction[] = [];
    if (!attachmentFile && canReplyToGroupChatMessage(message, groupStatus, effectiveCanPost, postingMuted === true)) actions.push("reply");
    if (canEditGroupChatMessage(message, userId)) actions.push("edit");
    if (canRetractGroupChatMessage(message, userId)) actions.push("retract");
    if (canHideGroupChatMessage(message, canHideMessages, currentMemberStatus)) actions.push("hide");
    if (canReportGroupChatMessage(message, canReport, currentMemberStatus)) actions.push("report");
    if (canPinGroupChatMessage(message, canPinMessages, currentMemberKind)) actions.push(message.pinned ? "unpin" : "pin");
    if (canViewGroupChatReadStatus(message, groupKind, currentMemberKind, currentMemberStatus)) actions.push("read-status");
    return actions;
  };

  return <div className="flex min-h-0 flex-1 flex-col" aria-label="Group conversation">
    {pages[0]?.unread_count ? <div className="flex shrink-0 justify-end"><span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold text-[#1f6a58]">{pages[0].unread_count} unread</span></div> : null}
    <div className="mt-0.5 shrink-0">
      <button type="button" aria-expanded={pinnedPanelOpen} onClick={() => setPinnedPanelOpen((open) => !open)} className="rounded-full border border-[#d7e5df] bg-[#f8fbf9] px-2.5 py-1 text-[11px] font-semibold text-[#1f6a58] hover:border-[#1f6a58]">Pinned messages ({pinnedCount})</button>
      {pinnedPanelOpen ? <section className="mt-2 rounded-xl border border-[#d7e5df] bg-[#f8fbf9] p-2" aria-label="Pinned messages">
        {pinnedQuery.isPending ? <p className="p-2 text-xs text-[#52736a]">Loading pinned messages...</p> : pinnedQuery.isError ? <div className="p-2 text-xs text-[#7a271a]" role="alert"><p>Pinned messages are unavailable right now.</p><button type="button" onClick={() => void pinnedQuery.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : pinnedMessages.length === 0 ? <p className="p-2 text-xs text-[#52736a]">No pinned messages.</p> : <div className="space-y-1">{pinnedMessages.map((message) => { const loaded = messages.some((candidate) => candidate.id === message.id); return <div key={message.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5"><button type="button" disabled={!loaded} onClick={() => locateReplyTarget(message.id)} className="min-w-0 flex-1 text-left disabled:cursor-default disabled:opacity-70"><span className="block truncate text-xs font-semibold text-[#16332b]">{message.sender_name}</span><span className="block truncate text-xs text-[#52736a]">{getPinnedMessagePreview(message)}</span></button>{loaded ? <span className="text-[10px] font-semibold text-[#1f6a58]">Jump</span> : <span className="text-[10px] text-[#7f9d94]">Not loaded</span>}</div>; })}</div>}
      </section> : null}
    </div>
    {restrictionMessage ? <p className={`mt-1 shrink-0 rounded-lg p-2 text-xs [@media(min-height:801px)]:mt-2 ${postingRestriction.reason === "muted" ? "border border-[#f3d5d1] bg-[#fff7f6] text-[#7a271a]" : groupIsClosed || postingRestriction.reason === "permission-refresh" ? "border border-[#f1d8ad] bg-[#fffaf0] text-[#8b5e00]" : "border border-[#d7e5df] bg-white text-[#52736a]"}`} role="status">{restrictionMessage}</p> : null}
    {readError ? <p className="mt-1 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs [@media(min-height:801px)]:mt-2" role="alert">{readError}</p> : null}
    {actionError ? <p className="mt-1 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs [@media(min-height:801px)]:mt-2" role="alert">{actionError}</p> : null}
    {reactionQuery.isPending ? <p className="mt-1 shrink-0 rounded-lg border border-[#d7e5df] bg-white p-2 text-xs [@media(min-height:801px)]:mt-2" role="status">Loading reactions...</p> : null}
    {reactionQuery.isError ? <p className="mt-1 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs [@media(min-height:801px)]:mt-2" role="alert">Reactions are unavailable right now. <button type="button" onClick={() => void reactionQuery.refetch()} className="font-semibold underline">Try again</button></p> : null}
    {historyQuery.isPending ? <div className="mt-1 min-h-0 flex-1 animate-pulse rounded-lg bg-[#f9fcfa] [@media(min-height:801px)]:mt-2" aria-busy="true" aria-label="Loading messages" /> : <>
      {historyQuery.isError ? <div className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert"><p>{historyQuery.error.message}</p><button type="button" onClick={() => void historyQuery.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : null}
      {historyQuery.isError && messages.length === 0 ? null : <div className="relative mt-1 min-h-0 flex-1 [@media(min-height:801px)]:mt-2">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-1 py-2" aria-live="polite">
      <div className="flex min-h-full flex-col justify-end gap-1">
      {historyQuery.hasNextPage ? <button type="button" disabled={historyQuery.isFetchingNextPage} onClick={loadOlder} className="mx-auto block rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{historyQuery.isFetchingNextPage ? "Loading older messages..." : "Load older messages"}</button> : null}
      {messages.length === 0 ? <p className="py-12 text-center text-sm text-[#52736a]">No messages yet.</p> : messages.map((message) => {
        const actions = getMessageActions(message);
        const messagePendingAction = pendingAction?.messageId === message.id ? pendingAction.action : null;
        const messageIsEditing = editingMessageId === message.id;
        const readSummaryUnavailable = message.read_summary?.available === false;
        const readStatusIndicatorEligible = !readSummaryUnavailable && canShowGroupChatReadStatusIndicator(message, userId, groupKind, currentMemberKind, currentMemberStatus);
        const readStatusOpen = readStatusMessageId === message.id && selectedReadStatusMessage !== null && readStatusAllowed;
        const messageReadStatus = message.read_summary ? null : (readStatusOpen && readStatusQuery.data?.message_id === message.id ? readStatusQuery.data : null) ?? readStatusByMessage[readStatusKey(groupId, userScope, tenantScope, message.id)] ?? queryClient.getQueryData<GroupChatMessageReadStatus>(groupChatReadStatusQueryKey(groupId, userScope, tenantScope, message.id)) ?? null;
        const messageReadSummary = message.read_summary ?? null;
        const messageReadStatusNames = messageReadStatus ? getGroupChatReadStatusMemberNames(messageReadStatus, memberDirectory) : [];
        return <MessageBubble key={message.id} message={message} messageRef={(node) => registerReadStatusElement(message.id, node)} isOwnMessage={message.sender_id === userId} isFirstUnread={message.id === firstUnreadMessageId} actions={actions} menuOpen={openMenuId === message.id} pendingAction={messagePendingAction} editMode={messageIsEditing} editDraft={editDraft} editError={messageIsEditing ? editError : null} hideReason={hideReason} mutationPending={mutationPending} replyTarget={message.reply_to ? messages.find((candidate) => candidate.id === message.reply_to?.id) ?? null : null} highlighted={highlightedMessageId === message.id} reactionSettings={reactionSettings} reactionPickerOpen={openReactionPickerId === message.id} reactionMutationPending={reactionMutationPending} onToggleReactionPicker={() => { if (!reactionMutationPending && reactionSettings?.enabled) setOpenReactionPickerId((current) => current === message.id ? null : message.id); }} onToggleReaction={(emoji) => toggleReaction(message, emoji)} onToggleMenu={() => { if (!mutationPending) { setOpenMenuId((current) => current === message.id ? null : message.id); setPendingAction(null); setActionError(null); } }} onReplyReference={locateReplyTarget} onSelectAction={(action) => { setActionError(null); if (action === "reply") { setReplyingTo(message); setOpenMenuId(null); setPendingAction(null); return; } if (action === "edit") { setEditingMessageId(message.id); setEditDraft(message.content ?? ""); setEditError(null); setPendingAction(null); setOpenMenuId(null); return; } if (action === "read-status") { setReadStatusSelection({ groupId, messageId: message.id }); setOpenMenuId(null); setPendingAction(null); return; } if (action === "pin" || action === "unpin") { setOpenMenuId(null); setPendingAction(null); pinMutation.mutate({ groupId, messageId: message.id, pinned: action === "pin" }); return; } setPendingAction({ messageId: message.id, action }); setOpenMenuId(message.id); if (action === "hide" || action === "report") setHideReason(""); }} onEditDraftChange={(value) => { setEditDraft(value); setEditError(null); }} onSaveEdit={() => { const payload = buildEditGroupChatMessagePayload(editDraft); if (!payload) { setEditError("Message content cannot be empty."); return; } editMutation.mutate({ groupId, messageId: message.id, content: payload.content }); }} onCancelEdit={() => { setEditingMessageId(null); setEditDraft(""); setEditError(null); setActionError(null); }} onHideReasonChange={(value) => { setHideReason(value); setActionError(null); }} onConfirmAction={() => { if (messagePendingAction === "retract") retractMutation.mutate({ groupId, messageId: message.id }); if (messagePendingAction === "hide" && hideReason.trim()) hideMutation.mutate({ groupId, messageId: message.id, reason: hideReason }); if (messagePendingAction === "report" && hideReason.trim()) reportMutation.mutate({ groupId, messageId: message.id, reason: hideReason, details: "" }); }} onCancelAction={() => { setOpenMenuId(null); setPendingAction(null); setHideReason(""); setActionError(null); }} readStatusEligible={readStatusIndicatorEligible} readStatusOpen={readStatusOpen} readStatus={messageReadStatus} readSummary={messageReadSummary} readStatusLoading={readStatusOpen && readStatusQuery.isPending && !messageReadStatus} readStatusError={readStatusOpen && readStatusQuery.isError} readStatusNames={messageReadStatusNames} onToggleReadStatus={() => { setReadStatusSelection((current) => current?.groupId === groupId && current.messageId === message.id ? null : { groupId, messageId: message.id }); setOpenMenuId(null); setPendingAction(null); }} onRetryReadStatus={() => void readStatusQuery.refetch()} onCloseReadStatus={() => setReadStatusSelection(null)} />;
      })}
      </div>
      </div>
      {showJumpToLatest ? <button type="button" onClick={jumpToLatest} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#b7dfc7] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f6a58] shadow-md hover:bg-[#f4faf7]">↓ Latest message</button> : null}
      </div>}
    </>}
    {replyingTo ? <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#b7dfc7] bg-[#f8fbf9] p-2 text-xs [@media(min-height:801px)]:mt-2" role="status">
      <div className="min-w-0 flex-1"><p className="font-semibold text-[#1f6a58]">Replying to {replyingTo.sender_name}</p><p className="truncate">{getGroupChatReplyPreview(replyingTo)}</p></div>
      <button type="button" onClick={() => setReplyingTo(null)} className="shrink-0 rounded-full border border-[#d7e5df] bg-white px-2 py-1 font-semibold text-[#52736a] hover:border-[#1f6a58] hover:text-[#1f6a58]">Cancel reply</button>
    </div> : null}
    {attachmentFile ? <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#d7e5df] bg-[#f8fbf9] p-2 text-xs [@media(min-height:801px)]:mt-2">
      {attachmentPreviewUrl ? <img src={attachmentPreviewUrl} alt="Selected attachment preview" className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e8f6ee] text-[10px] font-bold uppercase text-[#1f6a58]">{getGroupChatAttachmentType(attachmentFile)}</span>}
      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#16332b]">{pendingAttachment?.file_name || attachmentFile.name}</p><p>{attachmentUploadMutation.isPending ? "Uploading..." : pendingAttachment ? "Ready to send" : attachmentError ? "Upload failed" : "Preparing attachment..."}</p>{attachmentError ? <p className="mt-1 text-[#8f3b2f]" role="alert">{attachmentError}</p> : null}</div>
      <div className="flex shrink-0 gap-1.5">{attachmentError && !attachmentUploadMutation.isPending ? <button type="button" onClick={retryAttachmentUpload} disabled={postingDisabled} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#1f6a58] shadow-sm disabled:opacity-50">Retry</button> : null}<button type="button" onClick={clearAttachment} disabled={attachmentUploadMutation.isPending || attachmentSendMutation.isPending} className="rounded-full border border-[#d7e5df] bg-white px-2 py-1 text-[10px] font-semibold text-[#52736a] disabled:opacity-50">Remove</button></div>
    </div> : null}
    <form className="mt-1 flex shrink-0 items-end gap-2 [@media(min-height:801px)]:mt-2" onSubmit={submit}>
      <label className="sr-only" htmlFor={`group-message-${groupId}`}>Message</label>
      <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={postingDisabled || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || Boolean(attachmentFile) || Boolean(replyingTo)} aria-label="Attach file" title={replyingTo ? "Cancel reply before attaching a file" : "Attach file"} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7e5df] bg-[#f8fbf9] text-[#52736a] transition hover:border-[#1f6a58] hover:text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">+</button>
      <input ref={attachmentInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*,video/*" className="hidden" onChange={handleAttachmentSelected} />
      <textarea ref={composerRef} id={`group-message-${groupId}`} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={postingDisabled || sendMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || Boolean(attachmentFile)} placeholder={postingDisabled ? "Messaging is unavailable" : attachmentFile ? "Remove attachment to write a message" : "Write a message..."} rows={1} className="min-h-11 max-h-32 min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-[#d7e5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6a58] disabled:cursor-not-allowed disabled:bg-[#f4faf7]" />
      <button type="submit" disabled={postingDisabled || sendMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || (!pendingAttachment && !draft.trim())} className="self-end rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{attachmentSendMutation.isPending ? "Sending..." : sendMutation.isPending ? "Sending..." : pendingAttachment ? "Send file" : "Send"}</button>
    </form>
    {sendMutation.isError ? <p className="mt-2 text-sm text-[#b42318]" role="alert">{sendMutation.error.message}</p> : null}
  </div>;
}
