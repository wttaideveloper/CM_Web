"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@ihp/auth";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addGroupChatMessageReaction, downloadGroupChatAttachment, editGroupChatMessage, getGroupChatReactions, hideGroupChatMessage, listGroupChatMessages, listGroupChatPinnedMessages, markGroupChatRead, pinGroupChatMessage, removeGroupChatMessageReaction, retractGroupChatMessage, sendGroupChatAttachmentMessage, sendGroupChatTextMessage, unpinGroupChatMessage, uploadGroupChatAttachment } from "./group-chat/group-chat.service";
import { buildEditGroupChatMessagePayload, canEditGroupChatMessage, canHideGroupChatMessage, canPinGroupChatMessage, canReactToGroupChatMessage, canReplyToGroupChatMessage, canRetractGroupChatMessage, canSendGroupChatMessage, formatGroupChatAttachmentSummary, getGroupChatMessageDisplayText, getGroupChatPostingRestrictionMessage, getGroupChatReplyPreview, getGroupChatReplyReferencePreview, isGroupChatReactionSelected, mergeGroupChatMessagePages, normalizeGroupChatReactionCounts, resolveGroupChatAttachmentMetadata } from "./group-chat-models";
import type { GroupChatAttachment, GroupChatAttachmentType, GroupChatMessage, GroupChatReactionSettings } from "./group-chat/group-chat.types";

type Props = {
  groupId: string;
  groupStatus: string | null;
  canPost: boolean | null;
  postingMuted: boolean | null;
  canHideMessages: boolean | null;
  canPinMessages: boolean | null;
  currentMemberKind: string | null;
  currentMemberStatus: string | null;
};

const messageKey = (groupId: string) => ["group-chat", "messages", groupId];
const pinnedKey = (groupId: string) => ["group-chat", "pinned", groupId];

type EditVariables = { groupId: string; messageId: string; content: string };
type MessageActionVariables = { groupId: string; messageId: string };
type HideVariables = MessageActionVariables & { reason: string };
type SendVariables = { content: string; replyToId?: string };
type AttachmentUploadVariables = { groupId: string; file: File; attachmentType: GroupChatAttachmentType };
type AttachmentSendVariables = { groupId: string; attachment: GroupChatAttachment };
type ReactionVariables = { groupId: string; messageId: string; emoji: string; remove: boolean };
type PinVariables = { groupId: string; messageId: string; pinned: boolean };

function formatMessageTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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

type MessageAction = "reply" | "edit" | "retract" | "hide" | "pin" | "unpin";

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
  return <div className="mt-2 flex flex-wrap items-center gap-1" aria-label="Message reactions">
    {entries.map(([emoji, count]) => {
      const isSelected = selected.has(emoji);
      const canToggleExisting = canControl && (settings?.emojis.includes(emoji) || isSelected);
      return canToggleExisting ? <button key={emoji} type="button" disabled={mutationPending} aria-pressed={isSelected} onClick={() => onToggleReaction(emoji)} className={`rounded-full border px-2 py-0.5 text-xs transition ${isSelected ? "border-[#1f6a58] bg-[#d8f3e4] text-[#16332b]" : "border-[#d7e5df] bg-white/80 text-[#52736a]"} disabled:opacity-50`}>{emoji} {count}</button> : <span key={emoji} className="rounded-full border border-[#d7e5df] bg-white/70 px-2 py-0.5 text-xs text-[#52736a]">{emoji} {count}</span>;
    })}
    {canControl ? <div className="relative">
      <button type="button" aria-label="Add reaction" aria-expanded={pickerOpen} disabled={mutationPending} onClick={onTogglePicker} className="rounded-full border border-[#d7e5df] bg-white/80 px-2 py-0.5 text-xs font-semibold text-[#52736a] hover:border-[#1f6a58] hover:text-[#1f6a58] disabled:opacity-50">+</button>
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
};

function MessageBubble({ message, isOwnMessage, isFirstUnread, actions, menuOpen, pendingAction, editMode, editDraft, editError, hideReason, mutationPending, replyTarget, highlighted, onToggleMenu, onSelectAction, onReplyReference, onEditDraftChange, onSaveEdit, onCancelEdit, onHideReasonChange, onConfirmAction, onCancelAction, reactionSettings, reactionPickerOpen, reactionMutationPending, onToggleReactionPicker, onToggleReaction }: MessageBubbleProps) {
  const isSystemMessage = message.message_type.trim().toLowerCase() === "system";
  const status = message.status.trim().toLowerCase();
  const unavailable = status === "retracted" || status === "removed_by_admin";
  const messageClasses = `max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${actions.length > 0 ? "pr-12" : ""} ${highlighted ? "ring-2 ring-[#f0b429]" : ""} ${isOwnMessage ? "bg-[#1f6a58] text-white" : "border border-[#e1ebe6] bg-white text-[#16332b]"}`;
  const menuLabel = pendingAction === "retract" ? "Retract this message?" : pendingAction === "hide" ? "Hide this message?" : null;
  return <div className="group">
    {isFirstUnread ? <div className="my-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#1f6a58]"><span className="h-px flex-1 bg-[#b7dfc7]" />Unread messages<span className="h-px flex-1 bg-[#b7dfc7]" /></div> : null}
    {isSystemMessage ? <div className="flex justify-center py-1">
      <article className="inline-flex max-w-[90%] items-center gap-2 rounded-full bg-[#e8f6ee] px-3 py-1.5 text-center text-xs text-[#52736a] shadow-sm">
        <p className={unavailable ? "italic opacity-80" : "break-words"}>{getGroupChatMessageDisplayText(message)}</p>
        <time className="shrink-0 text-[10px] text-[#7f9d94]" dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
      </article>
    </div> : null}
    {!isSystemMessage ? <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <article data-group-message-id={message.id} className={`relative ${messageClasses}`}>
        {actions.length > 0 ? <div className="absolute right-1 top-1 z-10">
          <button type="button" aria-label={`Message actions for ${message.sender_name}`} aria-haspopup="menu" aria-expanded={menuOpen} title="Message actions" disabled={mutationPending} onClick={onToggleMenu} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-[#52736a] opacity-0 shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50">⋯</button>
          {menuOpen ? <div role="menu" aria-label="Message actions" className="absolute right-0 top-8 z-30 w-56 rounded-xl border border-[#d7e5df] bg-white p-2 text-sm text-[#16332b] shadow-lg">
            {pendingAction === null ? actions.map((action) => <button key={action} type="button" role="menuitem" onClick={() => onSelectAction(action)} className="block w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-[#e8f6ee] focus-visible:bg-[#e8f6ee] focus-visible:outline-none">{action === "reply" ? "Reply to message" : action === "edit" ? "Edit message" : action === "retract" ? "Retract message" : action === "hide" ? "Hide message" : action === "pin" ? "Pin message" : "Unpin message"}</button>) : <div>
              <p className="px-2 py-1 font-semibold">{menuLabel}</p>
              {pendingAction === "retract" ? <p className="px-2 py-1 text-xs text-[#52736a]">The original message will remain available for audit and will no longer be visible here.</p> : <label className="mt-2 block px-2 text-xs font-semibold text-[#52736a]">Reason<textarea value={hideReason} maxLength={255} onChange={(event) => onHideReasonChange(event.target.value)} disabled={mutationPending} className="mt-1 min-h-20 w-full rounded-lg border border-[#d7e5df] p-2 text-sm font-normal text-[#16332b] outline-none focus:border-[#1f6a58]" /></label>}
              <div className="mt-2 flex gap-2 px-2 pb-1"><button type="button" disabled={mutationPending || (pendingAction === "hide" && !hideReason.trim())} onClick={onConfirmAction} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{mutationPending ? pendingAction === "retract" ? "Retracting..." : "Hiding..." : "Confirm"}</button><button type="button" disabled={mutationPending} onClick={onCancelAction} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button></div>
            </div>}
          </div> : null}
        </div> : null}
        <div className={`mb-1 flex items-baseline gap-2 text-xs ${isOwnMessage ? "text-[#d8f3e4]" : "text-[#7f9d94]"}`}>
          <span className="font-semibold">{message.sender_name}</span>
          <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
          {message.is_edited ? <span className="italic">Edited</span> : null}
          {message.pinned && !unavailable ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isOwnMessage ? "bg-[#d8f3e4] text-[#16332b]" : "bg-[#e8f6ee] text-[#1f6a58]"}`}>Pinned</span> : null}
        </div>
        {!unavailable && message.reply_to ? <div className={`mb-2 border-l-2 pl-2 text-xs ${isOwnMessage ? "border-[#d8f3e4] text-[#e5f8eb]" : "border-[#8ccaa2] text-[#52736a]"}`}>
          {replyTarget ? <button type="button" onClick={() => onReplyReference(message.reply_to!.id)} className="block max-w-full text-left hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8f3e4]"><span className={`block truncate font-semibold ${isOwnMessage ? "text-white" : "text-[#1f6a58]"}`}>{message.reply_to.sender_name}</span><span className="block truncate">{getGroupChatReplyReferencePreview(message.reply_to, replyTarget)}</span></button> : <div><span className={`block truncate font-semibold ${isOwnMessage ? "text-white" : "text-[#1f6a58]"}`}>{message.reply_to.sender_name}</span><span className="block truncate">{getGroupChatReplyReferencePreview(message.reply_to)}</span></div>}
        </div> : null}
        {editMode ? <div><label className="sr-only" htmlFor={`edit-group-message-${message.id}`}>Edit message</label><textarea id={`edit-group-message-${message.id}`} value={editDraft} onChange={(event) => onEditDraftChange(event.target.value)} disabled={mutationPending} className="min-h-20 w-full resize-y rounded-lg border border-[#b7dfc7] bg-white p-2 text-sm text-[#16332b] outline-none focus:border-[#1f6a58]" />{editError ? <p className="mt-1 text-xs text-[#b42318]" role="alert">{editError}</p> : null}<div className="mt-2 flex gap-2"><button type="button" disabled={mutationPending || !editDraft.trim()} onClick={onSaveEdit} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{mutationPending ? "Saving..." : "Save"}</button><button type="button" disabled={mutationPending} onClick={onCancelEdit} className="rounded-full border border-white/70 px-3 py-1.5 text-xs font-semibold text-current">Cancel</button></div></div> : unavailable ? <p className="italic opacity-80">{getGroupChatMessageDisplayText(message)}</p> : message.attachment_id ? <GroupChatAttachmentMessage message={message} /> : <p className="whitespace-pre-wrap break-words">{getGroupChatMessageDisplayText(message)}</p>}
        <GroupChatReactionControls message={message} settings={reactionSettings} pickerOpen={reactionPickerOpen} mutationPending={reactionMutationPending} onTogglePicker={onToggleReactionPicker} onToggleReaction={onToggleReaction} />
      </article>
    </div> : null}
  </div>;
}

/** Renders REST-only Group Chat history and text messaging without using Direct Chat or Socket.IO. */
export default function GroupChatMessages({ groupId, groupStatus, canPost, postingMuted, canHideMessages, canPinMessages, currentMemberKind, currentMemberStatus }: Props) {
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
  const replyHighlightTimer = useRef<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ messageId: string; action: "retract" | "hide" } | null>(null);
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
  const groupIsClosed = groupStatus?.trim().toLowerCase() === "closed";
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

  useEffect(() => {
    initialScrollDone.current = false;
    scrollToBottomOnNextUpdate.current = false;
    previousScroll.current = null;
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
    attachmentUploadMutation.reset();
    attachmentSendMutation.reset();
    reactionMutation.reset();
    pinMutation.reset();
  }, [groupId]);

  useEffect(() => {
    if (canSendGroupChatMessage(groupStatus, canPost, postingMuted === true)) return;
    setReplyingTo(null);
  }, [groupStatus, canPost, postingMuted]);

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

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || messages.length === 0) return;
    if (scrollToBottomOnNextUpdate.current) {
      node.scrollTop = node.scrollHeight;
      scrollToBottomOnNextUpdate.current = false;
      return;
    }
    if (previousScroll.current) {
      const previous = previousScroll.current;
      node.scrollTop = previous.top + node.scrollHeight - previous.height;
      previousScroll.current = null;
      return;
    }
    if (!initialScrollDone.current) {
      node.scrollTop = node.scrollHeight;
      initialScrollDone.current = true;
    }
  }, [historyQuery.data, messages.length]);

  useEffect(() => {
    if (!hasLoadedHistory) return;
    let cancelled = false;
    void markGroupChatRead(groupId).catch((error: unknown) => {
      if (!cancelled) setReadError(error instanceof Error ? error.message : "Unable to mark Group Chat messages as read.");
    });
    return () => { cancelled = true; };
  }, [groupId, hasLoadedHistory]);

  const loadOlder = () => {
    const node = scrollRef.current;
    if (node) previousScroll.current = { height: node.scrollHeight, top: node.scrollTop };
    void historyQuery.fetchNextPage();
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
    if (!canSendGroupChatMessage(groupStatus, canPost, postingMuted === true)) {
      setAttachmentError(getGroupChatPostingRestrictionMessage(groupStatus, canPost, postingMuted) ?? "Attachments are unavailable in this group.");
      return;
    }
    const attachmentType = getGroupChatAttachmentType(file);
    setAttachmentFile(file);
    setPendingAttachment(null);
    setAttachmentError(null);
    attachmentUploadMutation.mutate({ groupId, file, attachmentType });
  };

  const retryAttachmentUpload = () => {
    if (!attachmentFile || !canSendGroupChatMessage(groupStatus, canPost, postingMuted === true)) return;
    setAttachmentError(null);
    attachmentUploadMutation.mutate({ groupId, file: attachmentFile, attachmentType: getGroupChatAttachmentType(attachmentFile) });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || groupIsClosed || canPost !== true || postingMuted === true) return;
    if (pendingAttachment) {
      attachmentSendMutation.mutate({ groupId, attachment: pendingAttachment });
      return;
    }
    if (!draft.trim()) return;
    sendMutation.mutate({ content: draft, replyToId: replyingTo?.id });
  };
  const postingDisabled = !canSendGroupChatMessage(groupStatus, canPost, postingMuted === true);
  const restrictionMessage = getGroupChatPostingRestrictionMessage(groupStatus, canPost, postingMuted);
  const mutationPending = editMutation.isPending || retractMutation.isPending || hideMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || pinMutation.isPending;
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
    if (!attachmentFile && canReplyToGroupChatMessage(message, groupStatus, canPost, postingMuted === true)) actions.push("reply");
    if (canEditGroupChatMessage(message, userId)) actions.push("edit");
    if (canRetractGroupChatMessage(message, userId)) actions.push("retract");
    if (canHideGroupChatMessage(message, canHideMessages, currentMemberStatus)) actions.push("hide");
    if (canPinGroupChatMessage(message, canPinMessages, currentMemberKind)) actions.push(message.pinned ? "unpin" : "pin");
    return actions;
  };

  return <div className="flex min-h-0 flex-1 flex-col" aria-label="Group conversation">
    {pages[0]?.unread_count ? <div className="flex shrink-0 justify-end"><span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold text-[#1f6a58]">{pages[0].unread_count} unread</span></div> : null}
    <div className="mt-2 shrink-0">
      <button type="button" aria-expanded={pinnedPanelOpen} onClick={() => setPinnedPanelOpen((open) => !open)} className="rounded-full border border-[#d7e5df] bg-[#f8fbf9] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] hover:border-[#1f6a58]">Pinned messages ({pinnedCount})</button>
      {pinnedPanelOpen ? <section className="mt-2 rounded-xl border border-[#d7e5df] bg-[#f8fbf9] p-2" aria-label="Pinned messages">
        {pinnedQuery.isPending ? <p className="p-2 text-xs text-[#52736a]">Loading pinned messages...</p> : pinnedQuery.isError ? <div className="p-2 text-xs text-[#7a271a]" role="alert"><p>Pinned messages are unavailable right now.</p><button type="button" onClick={() => void pinnedQuery.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : pinnedMessages.length === 0 ? <p className="p-2 text-xs text-[#52736a]">No pinned messages.</p> : <div className="space-y-1">{pinnedMessages.map((message) => { const loaded = messages.some((candidate) => candidate.id === message.id); return <div key={message.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5"><button type="button" disabled={!loaded} onClick={() => locateReplyTarget(message.id)} className="min-w-0 flex-1 text-left disabled:cursor-default disabled:opacity-70"><span className="block truncate text-xs font-semibold text-[#16332b]">{message.sender_name}</span><span className="block truncate text-xs text-[#52736a]">{getPinnedMessagePreview(message)}</span></button>{loaded ? <span className="text-[10px] font-semibold text-[#1f6a58]">Jump</span> : <span className="text-[10px] text-[#7f9d94]">Not loaded</span>}</div>; })}</div>}
      </section> : null}
    </div>
    {restrictionMessage ? <p className={`mt-2 shrink-0 rounded-lg p-2 text-xs ${groupIsClosed ? "border border-[#f1d8ad] bg-[#fffaf0] text-[#8b5e00]" : "border border-[#d7e5df] bg-white text-[#52736a]"}`} role="status">{restrictionMessage}</p> : null}
    {readError ? <p className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert">{readError}</p> : null}
    {actionError ? <p className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert">{actionError}</p> : null}
    {reactionQuery.isPending ? <p className="mt-2 shrink-0 rounded-lg border border-[#d7e5df] bg-white p-2 text-xs text-[#52736a]" role="status">Loading reactions...</p> : null}
    {reactionQuery.isError ? <p className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert">Reactions are unavailable right now. <button type="button" onClick={() => void reactionQuery.refetch()} className="font-semibold underline">Try again</button></p> : null}
    {historyQuery.isPending ? <div className="mt-2 min-h-0 flex-1 animate-pulse rounded-lg bg-[#f9fcfa]" aria-busy="true" aria-label="Loading messages" /> : <>
      {historyQuery.isError ? <div className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert"><p>{historyQuery.error.message}</p><button type="button" onClick={() => void historyQuery.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : null}
      {historyQuery.isError && messages.length === 0 ? null : <div ref={scrollRef} className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 py-2" aria-live="polite">
      <div className="flex min-h-full flex-col justify-end gap-2">
      {historyQuery.hasNextPage ? <button type="button" disabled={historyQuery.isFetchingNextPage} onClick={loadOlder} className="mx-auto block rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{historyQuery.isFetchingNextPage ? "Loading older messages..." : "Load older messages"}</button> : null}
      {messages.length === 0 ? <p className="py-12 text-center text-sm text-[#52736a]">No messages yet.</p> : messages.map((message) => {
        const actions = getMessageActions(message);
        const messagePendingAction = pendingAction?.messageId === message.id ? pendingAction.action : null;
        const messageIsEditing = editingMessageId === message.id;
        return <MessageBubble key={message.id} message={message} isOwnMessage={message.sender_id === userId} isFirstUnread={message.id === firstUnreadMessageId} actions={actions} menuOpen={openMenuId === message.id} pendingAction={messagePendingAction} editMode={messageIsEditing} editDraft={editDraft} editError={messageIsEditing ? editError : null} hideReason={hideReason} mutationPending={mutationPending} replyTarget={message.reply_to ? messages.find((candidate) => candidate.id === message.reply_to?.id) ?? null : null} highlighted={highlightedMessageId === message.id} reactionSettings={reactionSettings} reactionPickerOpen={openReactionPickerId === message.id} reactionMutationPending={reactionMutationPending} onToggleReactionPicker={() => { if (!reactionMutationPending && reactionSettings?.enabled) setOpenReactionPickerId((current) => current === message.id ? null : message.id); }} onToggleReaction={(emoji) => toggleReaction(message, emoji)} onToggleMenu={() => { if (!mutationPending) { setOpenMenuId((current) => current === message.id ? null : message.id); setPendingAction(null); setActionError(null); } }} onReplyReference={locateReplyTarget} onSelectAction={(action) => { setActionError(null); if (action === "reply") { setReplyingTo(message); setOpenMenuId(null); setPendingAction(null); return; } if (action === "edit") { setEditingMessageId(message.id); setEditDraft(message.content ?? ""); setEditError(null); setPendingAction(null); setOpenMenuId(null); return; } if (action === "pin" || action === "unpin") { setOpenMenuId(null); setPendingAction(null); pinMutation.mutate({ groupId, messageId: message.id, pinned: action === "pin" }); return; } setPendingAction({ messageId: message.id, action }); setOpenMenuId(message.id); if (action === "hide") setHideReason(""); }} onEditDraftChange={(value) => { setEditDraft(value); setEditError(null); }} onSaveEdit={() => { const payload = buildEditGroupChatMessagePayload(editDraft); if (!payload) { setEditError("Message content cannot be empty."); return; } editMutation.mutate({ groupId, messageId: message.id, content: payload.content }); }} onCancelEdit={() => { setEditingMessageId(null); setEditDraft(""); setEditError(null); setActionError(null); }} onHideReasonChange={(value) => { setHideReason(value); setActionError(null); }} onConfirmAction={() => { if (messagePendingAction === "retract") retractMutation.mutate({ groupId, messageId: message.id }); if (messagePendingAction === "hide" && hideReason.trim()) hideMutation.mutate({ groupId, messageId: message.id, reason: hideReason }); }} onCancelAction={() => { setOpenMenuId(null); setPendingAction(null); setHideReason(""); setActionError(null); }} />;
      })}
      </div>
      </div>}
    </>}
    {replyingTo ? <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#b7dfc7] bg-[#f8fbf9] p-2 text-xs text-[#52736a]" role="status">
      <div className="min-w-0 flex-1"><p className="font-semibold text-[#1f6a58]">Replying to {replyingTo.sender_name}</p><p className="truncate">{getGroupChatReplyPreview(replyingTo)}</p></div>
      <button type="button" onClick={() => setReplyingTo(null)} className="shrink-0 rounded-full border border-[#d7e5df] bg-white px-2 py-1 font-semibold text-[#52736a] hover:border-[#1f6a58] hover:text-[#1f6a58]">Cancel reply</button>
    </div> : null}
    {attachmentFile ? <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#d7e5df] bg-[#f8fbf9] p-2 text-xs text-[#52736a]">
      {attachmentPreviewUrl ? <img src={attachmentPreviewUrl} alt="Selected attachment preview" className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e8f6ee] text-[10px] font-bold uppercase text-[#1f6a58]">{getGroupChatAttachmentType(attachmentFile)}</span>}
      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#16332b]">{pendingAttachment?.file_name || attachmentFile.name}</p><p>{attachmentUploadMutation.isPending ? "Uploading..." : pendingAttachment ? "Ready to send" : attachmentError ? "Upload failed" : "Preparing attachment..."}</p>{attachmentError ? <p className="mt-1 text-[#8f3b2f]" role="alert">{attachmentError}</p> : null}</div>
      <div className="flex shrink-0 gap-1.5">{attachmentError && !attachmentUploadMutation.isPending ? <button type="button" onClick={retryAttachmentUpload} disabled={postingDisabled} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#1f6a58] shadow-sm disabled:opacity-50">Retry</button> : null}<button type="button" onClick={clearAttachment} disabled={attachmentUploadMutation.isPending || attachmentSendMutation.isPending} className="rounded-full border border-[#d7e5df] bg-white px-2 py-1 text-[10px] font-semibold text-[#52736a] disabled:opacity-50">Remove</button></div>
    </div> : null}
    <form className="mt-2 flex shrink-0 items-end gap-2" onSubmit={submit}>
      <label className="sr-only" htmlFor={`group-message-${groupId}`}>Message</label>
      <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={postingDisabled || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || Boolean(attachmentFile) || Boolean(replyingTo)} aria-label="Attach file" title={replyingTo ? "Cancel reply before attaching a file" : "Attach file"} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7e5df] bg-[#f8fbf9] text-[#52736a] transition hover:border-[#1f6a58] hover:text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">+</button>
      <input ref={attachmentInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*,video/*" className="hidden" onChange={handleAttachmentSelected} />
      <textarea ref={composerRef} id={`group-message-${groupId}`} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={postingDisabled || sendMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || Boolean(attachmentFile)} placeholder={postingDisabled ? "Messaging is unavailable" : attachmentFile ? "Remove attachment to write a message" : "Write a message..."} rows={1} className="min-h-11 max-h-32 min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-[#d7e5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6a58] disabled:cursor-not-allowed disabled:bg-[#f4faf7]" />
      <button type="submit" disabled={postingDisabled || sendMutation.isPending || attachmentUploadMutation.isPending || attachmentSendMutation.isPending || (!pendingAttachment && !draft.trim())} className="self-end rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{attachmentSendMutation.isPending ? "Sending..." : sendMutation.isPending ? "Sending..." : pendingAttachment ? "Send file" : "Send"}</button>
    </form>
    {sendMutation.isError ? <p className="mt-2 text-sm text-[#b42318]" role="alert">{sendMutation.error.message}</p> : null}
  </div>;
}
