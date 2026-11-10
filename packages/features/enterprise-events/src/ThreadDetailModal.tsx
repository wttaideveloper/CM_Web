"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEventDiscussionThread } from "./event-discussions.service";
import { MessageCard } from "./MessageCard";
import { MessageComposer } from "./MessageComposer";
import type { EventDiscussionMessage } from "./event-discussions.types";

export interface ThreadDetailModalProps {
  eventId: string;
  messageId: string;
  replyId?: string | null;
  onClose: () => void;
  isAdmin?: boolean;
}

/**
 * ThreadDetailModal
 *
 * Displays a single discussion message thread and its threaded replies in an
 * accessible modal drawer, with automatic scrolling/pulsing for deep-linked replies.
 */
export function ThreadDetailModal({
  eventId,
  messageId,
  replyId,
  onClose,
  isAdmin = false,
}: ThreadDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { data: thread, isLoading, isError, error, refetch } = useQuery<EventDiscussionMessage>({
    queryKey: ["discussions", "thread", eventId, messageId],
    queryFn: () => getEventDiscussionThread(eventId, messageId),
    enabled: Boolean(eventId && messageId),
    staleTime: 15_000,
    retry: 1,
  });

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!replyId || isLoading || !thread) return;
    const targetElement = document.getElementById(`discussion-msg-${replyId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [replyId, isLoading, thread]);

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/50 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="thread-dialog-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-[#e1ebe6]"
      >
        <div className="flex items-center justify-between border-b border-[#e1ebe6] px-6 py-4">
          <h2 id="thread-dialog-title" className="text-base font-bold text-[#06201c]">
            Discussion Thread
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close thread dialog"
            className="rounded-full p-2 text-[#52736a] hover:bg-[#edf3f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div role="status" className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-[#edf3f0]" />
              <div className="h-16 animate-pulse rounded-xl bg-[#edf3f0]" />
              <p className="text-xs text-[#52736a]">Loading discussion thread…</p>
            </div>
          ) : isError ? (
            <div role="alert" className="rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] p-6 text-center space-y-2">
              <div className="text-2xl" aria-hidden="true">🗑️</div>
              <p className="text-sm font-semibold text-[#06201c]">
                {error instanceof Error && (error.message.includes("404") || error.message.includes("MESSAGE_UNAVAILABLE") || error.message.includes("available"))
                  ? "This discussion message has been deleted or is no longer available."
                  : error instanceof Error ? error.message : "Unable to load discussion thread."}
              </p>
              {!(error instanceof Error && (error.message.includes("404") || error.message.includes("available"))) && (
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-2 font-semibold text-[#1f6a58] underline text-sm"
                >
                  Retry
                </button>
              )}
            </div>
          ) : thread ? (
            <div className="space-y-6">
              <MessageCard message={thread} showReplyCount={false} />

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6a8a80]">
                  Replies ({thread.replies?.length ?? 0})
                </h3>

                {thread.replies && thread.replies.length > 0 ? (
                  <div className="space-y-3 pl-4 border-l-2 border-[#d7e5df]">
                    {thread.replies.map((reply) => (
                      <MessageCard
                        key={reply.id}
                        message={reply}
                        isHighlighted={reply.id === replyId}
                        showReplyCount={false}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-[#52736a]">
                    No replies yet. Be the first to reply!
                  </p>
                )}
              </div>

              <div className="pt-2">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6a8a80]">
                  Add a Reply
                </h4>
                <MessageComposer
                  eventId={eventId}
                  parentMessageId={messageId}
                  isAdmin={isAdmin}
                  placeholder="Type your reply…"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
