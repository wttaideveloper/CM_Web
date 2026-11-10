"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEventDiscussions } from "./event-discussions.service";
import { MessageCard } from "./MessageCard";
import { MessageComposer } from "./MessageComposer";
import { ThreadDetailModal } from "./ThreadDetailModal";
import type { DiscussionFilter, EventDiscussionMessage } from "./event-discussions.types";

export interface DiscussionFeedProps {
  eventId: string;
  isAdmin?: boolean;
  canPost?: boolean;
  lockedReason?: string | null;
  initialMessageId?: string | null;
  initialReplyId?: string | null;
}

/**
 * DiscussionFeed
 *
 * Full interactive discussion list with announcement carousel, category filters,
 * root message composer, and threaded discussion modal.
 */
export function DiscussionFeed({
  eventId,
  isAdmin = false,
  canPost = true,
  lockedReason,
  initialMessageId,
  initialReplyId,
}: DiscussionFeedProps) {
  const [filter, setFilter] = useState<DiscussionFilter>("all");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialMessageId ?? null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(initialReplyId ?? null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["discussions", "list", eventId, filter],
    queryFn: () => listEventDiscussions(eventId, filter),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const messages = data?.items ?? [];
  const announcements = messages.filter((m) => m.is_announcement);

  const handleOpenThread = (msg: EventDiscussionMessage | { id: string; parent_id?: string | null }) => {
    if (msg.parent_id) {
      setActiveThreadId(msg.parent_id);
      setActiveReplyId(msg.id);
    } else {
      setActiveThreadId(msg.id);
      setActiveReplyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <MessageComposer
        eventId={eventId}
        isAdmin={isAdmin}
        canPost={canPost}
        lockedReason={lockedReason}
      />

      {announcements.length > 0 && filter === "all" && (
        <section aria-labelledby="announcements-heading" className="space-y-3">
          <h3 id="announcements-heading" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1f6a58]">
            <span>📢</span>
            <span>Pinned Announcements</span>
          </h3>
          <div className="grid gap-3">
            {announcements.map((announcement) => (
              <MessageCard
                key={announcement.id}
                message={announcement}
                onReplyClick={handleOpenThread}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1ebe6] pb-3">
        <div className="flex items-center gap-1.5 rounded-xl bg-[#f0f4f3] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition ${
              filter === "all" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            All Messages
          </button>
          <button
            type="button"
            onClick={() => setFilter("announcements")}
            className={`rounded-lg px-3 py-1.5 transition ${
              filter === "announcements" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Announcements
          </button>
          <button
            type="button"
            onClick={() => setFilter("my_messages")}
            className={`rounded-lg px-3 py-1.5 transition ${
              filter === "my_messages" ? "bg-white text-[#1f6a58] shadow-sm" : "text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            My Questions
          </button>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          aria-label="Refresh discussions"
          className="text-xs font-semibold text-[#1f6a58] hover:underline"
        >
          🔄 Refresh
        </button>
      </div>

      {isLoading ? (
        <div role="status" className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-[#edf3f0]" />
          <div className="h-28 animate-pulse rounded-2xl bg-[#edf3f0]" />
          <p className="text-xs text-[#52736a]">Loading discussion feed…</p>
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-[#f2c7c2] bg-[#fff7f5] p-6 text-center">
          <p className="text-sm font-semibold text-[#b42318]">
            {error instanceof Error ? error.message : "Failed to load discussions."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 inline-flex rounded-xl bg-[#1f6a58] px-4 py-2 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#ccdcd4] bg-[#fbfdfc] p-8 text-center">
          <p className="text-sm font-semibold text-[#06201c]">No discussion messages found.</p>
          <p className="mt-1 text-xs text-[#52736a]">
            {filter === "announcements"
              ? "There are no announcements posted for this event yet."
              : "Be the first to post a question or topic!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onReplyClick={handleOpenThread}
            />
          ))}
        </div>
      )}

      {activeThreadId && (
        <ThreadDetailModal
          eventId={eventId}
          messageId={activeThreadId}
          replyId={activeReplyId}
          isAdmin={isAdmin}
          onClose={() => {
            setActiveThreadId(null);
            setActiveReplyId(null);
          }}
        />
      )}
    </div>
  );
}
