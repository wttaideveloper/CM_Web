"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@ihp/auth";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { editGroupChatMessage, hideGroupChatMessage, listGroupChatMessages, markGroupChatRead, retractGroupChatMessage, sendGroupChatTextMessage } from "./group-chat/group-chat.service";
import { buildEditGroupChatMessagePayload, canEditGroupChatMessage, canHideGroupChatMessage, canRetractGroupChatMessage, canSendGroupChatMessage, getGroupChatMessageDisplayText, getGroupChatPostingRestrictionMessage, mergeGroupChatMessagePages } from "./group-chat-models";
import type { GroupChatMessage } from "./group-chat/group-chat.types";

type Props = {
  groupId: string;
  groupStatus: string | null;
  canPost: boolean | null;
  postingMuted: boolean | null;
  canHideMessages: boolean | null;
  currentMemberStatus: string | null;
};

const messageKey = (groupId: string) => ["group-chat", "messages", groupId];

type EditVariables = { groupId: string; messageId: string; content: string };
type MessageActionVariables = { groupId: string; messageId: string };
type HideVariables = MessageActionVariables & { reason: string };

function formatMessageTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

type MessageAction = "edit" | "retract" | "hide";

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
  onToggleMenu: () => void;
  onSelectAction: (action: MessageAction) => void;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onHideReasonChange: (value: string) => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
};

function MessageBubble({ message, isOwnMessage, isFirstUnread, actions, menuOpen, pendingAction, editMode, editDraft, editError, hideReason, mutationPending, onToggleMenu, onSelectAction, onEditDraftChange, onSaveEdit, onCancelEdit, onHideReasonChange, onConfirmAction, onCancelAction }: MessageBubbleProps) {
  const isSystemMessage = message.message_type.trim().toLowerCase() === "system";
  const status = message.status.trim().toLowerCase();
  const unavailable = status === "retracted" || status === "removed_by_admin";
  const messageClasses = `max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${actions.length > 0 ? "pr-12" : ""} ${isOwnMessage ? "bg-[#1f6a58] text-white" : "border border-[#e1ebe6] bg-white text-[#16332b]"}`;
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
      <article className={`relative ${messageClasses}`}>
        {actions.length > 0 ? <div className="absolute right-1 top-1 z-10">
          <button type="button" aria-label={`Message actions for ${message.sender_name}`} aria-haspopup="menu" aria-expanded={menuOpen} title="Message actions" disabled={mutationPending} onClick={onToggleMenu} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-[#52736a] opacity-0 shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50">⋯</button>
          {menuOpen ? <div role="menu" aria-label="Message actions" className="absolute right-0 top-8 z-30 w-56 rounded-xl border border-[#d7e5df] bg-white p-2 text-sm text-[#16332b] shadow-lg">
            {pendingAction === null ? actions.map((action) => <button key={action} type="button" role="menuitem" onClick={() => onSelectAction(action)} className="block w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-[#e8f6ee] focus-visible:bg-[#e8f6ee] focus-visible:outline-none">{action === "edit" ? "Edit message" : action === "retract" ? "Retract message" : "Hide message"}</button>) : <div>
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
        </div>
        {editMode ? <div><label className="sr-only" htmlFor={`edit-group-message-${message.id}`}>Edit message</label><textarea id={`edit-group-message-${message.id}`} value={editDraft} onChange={(event) => onEditDraftChange(event.target.value)} disabled={mutationPending} className="min-h-20 w-full resize-y rounded-lg border border-[#b7dfc7] bg-white p-2 text-sm text-[#16332b] outline-none focus:border-[#1f6a58]" />{editError ? <p className="mt-1 text-xs text-[#b42318]" role="alert">{editError}</p> : null}<div className="mt-2 flex gap-2"><button type="button" disabled={mutationPending || !editDraft.trim()} onClick={onSaveEdit} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{mutationPending ? "Saving..." : "Save"}</button><button type="button" disabled={mutationPending} onClick={onCancelEdit} className="rounded-full border border-white/70 px-3 py-1.5 text-xs font-semibold text-current">Cancel</button></div></div> : <p className={unavailable ? "italic opacity-80" : "whitespace-pre-wrap break-words"}>{getGroupChatMessageDisplayText(message)}</p>}
      </article>
    </div> : null}
  </div>;
}

/** Renders REST-only Group Chat history and text messaging without using Direct Chat or Socket.IO. */
export default function GroupChatMessages({ groupId, groupStatus, canPost, postingMuted, canHideMessages, currentMemberStatus }: Props) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [readError, setReadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const initialScrollDone = useRef(false);
  const scrollToBottomOnNextUpdate = useRef(false);
  const previousScroll = useRef<{ height: number; top: number } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ messageId: string; action: "retract" | "hide" } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const groupIsClosed = groupStatus?.trim().toLowerCase() === "closed";
  const historyQuery = useInfiniteQuery({
    queryKey: messageKey(groupId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => listGroupChatMessages(groupId, { limit: 50, ...(pageParam ? { cursor: pageParam } : {}), signal }),
    getNextPageParam: (lastPage) => lastPage.has_more && lastPage.next_cursor ? lastPage.next_cursor : undefined,
    retry: false,
  });
  const pages = historyQuery.data?.pages ?? [];
  const messages = mergeGroupChatMessagePages(pages);
  const firstUnreadMessageId = pages.map((page) => page.first_unread_message_id).find((value): value is string => Boolean(value)) ?? null;
  const sendMutation = useMutation({
    mutationFn: (content: string) => sendGroupChatTextMessage(groupId, content),
    retry: false,
    onSuccess: async () => {
      setDraft("");
      scrollToBottomOnNextUpdate.current = true;
      await queryClient.invalidateQueries({ queryKey: messageKey(groupId) });
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
  }, [groupId]);

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
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendMutation.isPending || !draft.trim() || groupIsClosed || canPost !== true || postingMuted === true) return;
    sendMutation.mutate(draft);
  };
  const postingDisabled = !canSendGroupChatMessage(groupStatus, canPost, postingMuted === true);
  const restrictionMessage = getGroupChatPostingRestrictionMessage(groupStatus, canPost, postingMuted);
  const mutationPending = editMutation.isPending || retractMutation.isPending || hideMutation.isPending;
  const getMessageActions = (message: GroupChatMessage): readonly MessageAction[] => {
    const actions: MessageAction[] = [];
    if (canEditGroupChatMessage(message, userId)) actions.push("edit");
    if (canRetractGroupChatMessage(message, userId)) actions.push("retract");
    if (canHideGroupChatMessage(message, canHideMessages, currentMemberStatus)) actions.push("hide");
    return actions;
  };

  return <div className="flex min-h-0 flex-1 flex-col" aria-label="Group conversation">
    {pages[0]?.unread_count ? <div className="flex shrink-0 justify-end"><span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold text-[#1f6a58]">{pages[0].unread_count} unread</span></div> : null}
    {restrictionMessage ? <p className={`mt-2 shrink-0 rounded-lg p-2 text-xs ${groupIsClosed ? "border border-[#f1d8ad] bg-[#fffaf0] text-[#8b5e00]" : "border border-[#d7e5df] bg-white text-[#52736a]"}`} role="status">{restrictionMessage}</p> : null}
    {readError ? <p className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert">{readError}</p> : null}
    {actionError ? <p className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert">{actionError}</p> : null}
    {historyQuery.isPending ? <div className="mt-2 min-h-0 flex-1 animate-pulse rounded-lg bg-[#f9fcfa]" aria-busy="true" aria-label="Loading messages" /> : <>
      {historyQuery.isError ? <div className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert"><p>{historyQuery.error.message}</p><button type="button" onClick={() => void historyQuery.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : null}
      {historyQuery.isError && messages.length === 0 ? null : <div ref={scrollRef} className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 py-2" aria-live="polite">
      <div className="flex min-h-full flex-col justify-end gap-2">
      {historyQuery.hasNextPage ? <button type="button" disabled={historyQuery.isFetchingNextPage} onClick={loadOlder} className="mx-auto block rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{historyQuery.isFetchingNextPage ? "Loading older messages..." : "Load older messages"}</button> : null}
      {messages.length === 0 ? <p className="py-12 text-center text-sm text-[#52736a]">No messages yet.</p> : messages.map((message) => {
        const actions = getMessageActions(message);
        const messagePendingAction = pendingAction?.messageId === message.id ? pendingAction.action : null;
        const messageIsEditing = editingMessageId === message.id;
        return <MessageBubble key={message.id} message={message} isOwnMessage={message.sender_id === userId} isFirstUnread={message.id === firstUnreadMessageId} actions={actions} menuOpen={openMenuId === message.id} pendingAction={messagePendingAction} editMode={messageIsEditing} editDraft={editDraft} editError={messageIsEditing ? editError : null} hideReason={hideReason} mutationPending={mutationPending} onToggleMenu={() => { if (!mutationPending) { setOpenMenuId((current) => current === message.id ? null : message.id); setPendingAction(null); setActionError(null); } }} onSelectAction={(action) => { setActionError(null); if (action === "edit") { setEditingMessageId(message.id); setEditDraft(message.content ?? ""); setEditError(null); setPendingAction(null); setOpenMenuId(null); } else { setPendingAction({ messageId: message.id, action }); setOpenMenuId(message.id); if (action === "hide") setHideReason(""); } }} onEditDraftChange={(value) => { setEditDraft(value); setEditError(null); }} onSaveEdit={() => { const payload = buildEditGroupChatMessagePayload(editDraft); if (!payload) { setEditError("Message content cannot be empty."); return; } editMutation.mutate({ groupId, messageId: message.id, content: payload.content }); }} onCancelEdit={() => { setEditingMessageId(null); setEditDraft(""); setEditError(null); setActionError(null); }} onHideReasonChange={(value) => { setHideReason(value); setActionError(null); }} onConfirmAction={() => { if (messagePendingAction === "retract") retractMutation.mutate({ groupId, messageId: message.id }); if (messagePendingAction === "hide" && hideReason.trim()) hideMutation.mutate({ groupId, messageId: message.id, reason: hideReason }); }} onCancelAction={() => { setOpenMenuId(null); setPendingAction(null); setHideReason(""); setActionError(null); }} />;
      })}
      </div>
      </div>}
    </>}
    <form className="mt-2 flex shrink-0 items-end gap-2" onSubmit={submit}>
      <label className="sr-only" htmlFor={`group-message-${groupId}`}>Message</label>
      <textarea ref={composerRef} id={`group-message-${groupId}`} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={postingDisabled || sendMutation.isPending} placeholder={postingDisabled ? "Messaging is unavailable" : "Write a message..."} rows={1} className="min-h-11 max-h-32 min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-[#d7e5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6a58] disabled:cursor-not-allowed disabled:bg-[#f4faf7]" />
      <button type="submit" disabled={postingDisabled || sendMutation.isPending || !draft.trim()} className="self-end rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{sendMutation.isPending ? "Sending..." : "Send"}</button>
    </form>
    {sendMutation.isError ? <p className="mt-2 text-sm text-[#b42318]" role="alert">{sendMutation.error.message}</p> : null}
  </div>;
}
