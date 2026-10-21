"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@ihp/auth";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listGroupChatMessages, markGroupChatRead, sendGroupChatTextMessage } from "./group-chat/group-chat.service";
import { canSendGroupChatMessage, getGroupChatMessageDisplayText, getGroupChatPostingRestrictionMessage, mergeGroupChatMessagePages } from "./group-chat-models";
import type { GroupChatMessage } from "./group-chat/group-chat.types";

type Props = {
  groupId: string;
  groupStatus: string | null;
  canPost: boolean | null;
  postingMuted: boolean | null;
};

const messageKey = (groupId: string) => ["group-chat", "messages", groupId];

function formatMessageTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function MessageBubble({ message, isOwnMessage, isFirstUnread }: { message: GroupChatMessage; isOwnMessage: boolean; isFirstUnread: boolean }) {
  const isSystemMessage = message.message_type.trim().toLowerCase() === "system";
  const status = message.status.trim().toLowerCase();
  const unavailable = status === "retracted" || status === "removed_by_admin";
  return <div>
    {isFirstUnread ? <div className="my-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#1f6a58]"><span className="h-px flex-1 bg-[#b7dfc7]" />Unread messages<span className="h-px flex-1 bg-[#b7dfc7]" /></div> : null}
    {isSystemMessage ? <div className="flex justify-center py-1">
      <article className="inline-flex max-w-[90%] items-center gap-2 rounded-full bg-[#e8f6ee] px-3 py-1.5 text-center text-xs text-[#52736a] shadow-sm">
        <p className={unavailable ? "italic opacity-80" : "break-words"}>{getGroupChatMessageDisplayText(message)}</p>
        <time className="shrink-0 text-[10px] text-[#7f9d94]" dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
      </article>
    </div> : null}
    {!isSystemMessage ? <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <article className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isOwnMessage ? "bg-[#1f6a58] text-white" : "border border-[#e1ebe6] bg-white text-[#16332b]"}`}>
        <div className={`mb-1 flex items-baseline gap-2 text-xs ${isOwnMessage ? "text-[#d8f3e4]" : "text-[#7f9d94]"}`}>
          <span className="font-semibold">{message.sender_name}</span>
          <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
        </div>
        <p className={unavailable ? "italic opacity-80" : "whitespace-pre-wrap break-words"}>{getGroupChatMessageDisplayText(message)}</p>
      </article>
    </div> : null}
  </div>;
}

/** Renders REST-only Group Chat history and text messaging without using Direct Chat or Socket.IO. */
export default function GroupChatMessages({ groupId, groupStatus, canPost, postingMuted }: Props) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [readError, setReadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const initialScrollDone = useRef(false);
  const scrollToBottomOnNextUpdate = useRef(false);
  const previousScroll = useRef<{ height: number; top: number } | null>(null);
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
  const hasLoadedHistory = pages.length > 0;

  useEffect(() => {
    initialScrollDone.current = false;
    scrollToBottomOnNextUpdate.current = false;
    previousScroll.current = null;
    setDraft("");
    setReadError(null);
  }, [groupId]);

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

  return <div className="flex min-h-0 flex-1 flex-col" aria-label="Group conversation">
    {pages[0]?.unread_count ? <div className="flex shrink-0 justify-end"><span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold text-[#1f6a58]">{pages[0].unread_count} unread</span></div> : null}
    {restrictionMessage ? <p className={`mt-2 shrink-0 rounded-lg p-2 text-xs ${groupIsClosed ? "border border-[#f1d8ad] bg-[#fffaf0] text-[#8b5e00]" : "border border-[#d7e5df] bg-white text-[#52736a]"}`} role="status">{restrictionMessage}</p> : null}
    {readError ? <p className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert">{readError}</p> : null}
    {historyQuery.isPending ? <div className="mt-2 min-h-0 flex-1 animate-pulse rounded-lg bg-[#f9fcfa]" aria-busy="true" aria-label="Loading messages" /> : <>
      {historyQuery.isError ? <div className="mt-2 shrink-0 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-2 text-xs text-[#7a271a]" role="alert"><p>{historyQuery.error.message}</p><button type="button" onClick={() => void historyQuery.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : null}
      {historyQuery.isError && messages.length === 0 ? null : <div ref={scrollRef} className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 py-2" aria-live="polite">
      <div className="flex min-h-full flex-col justify-end gap-2">
      {historyQuery.hasNextPage ? <button type="button" disabled={historyQuery.isFetchingNextPage} onClick={loadOlder} className="mx-auto block rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{historyQuery.isFetchingNextPage ? "Loading older messages..." : "Load older messages"}</button> : null}
      {messages.length === 0 ? <p className="py-12 text-center text-sm text-[#52736a]">No messages yet.</p> : messages.map((message) => <MessageBubble key={message.id} message={message} isOwnMessage={message.sender_id === userId} isFirstUnread={message.id === firstUnreadMessageId} />)}
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
