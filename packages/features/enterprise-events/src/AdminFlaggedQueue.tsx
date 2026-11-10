"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listEventFlaggedDiscussions, moderateEventDiscussion } from "./event-discussions.service";
import type { EventDiscussionFlaggedItem } from "./event-discussions.types";
import { formatAuditDateTime } from "./event-detail-formatters";

export interface AdminFlaggedQueueProps {
  eventId: string;
  highlightMessageId?: string | null;
}

/**
 * AdminFlaggedQueue
 *
 * Dedicated moderation console for Enterprise Admins to inspect AI-flagged
 * messages and approve or delete them with immediate audit trail recording.
 */
export function AdminFlaggedQueue({ eventId, highlightMessageId }: AdminFlaggedQueueProps) {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["discussions", "flagged", eventId],
    queryFn: () => listEventFlaggedDiscussions(eventId),
    enabled: Boolean(eventId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: async ({ messageId, action }: { messageId: string; action: "approve" | "delete" }) => {
      setActingId(messageId);
      return moderateEventDiscussion(eventId, messageId, { action });
    },
    onSettled: () => {
      setActingId(null);
      void queryClient.invalidateQueries({ queryKey: ["discussions", "flagged", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["discussions", "list", eventId] });
    },
  });

  const items = data?.items ?? [];

  useEffect(() => {
    if (!highlightMessageId || isLoading) return;
    const element = document.getElementById(`flagged-card-${highlightMessageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightMessageId, isLoading]);

  if (isLoading) {
    return (
      <div role="status" className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-[#edf3f0]" />
        <div className="h-32 animate-pulse rounded-2xl bg-[#edf3f0]" />
        <p className="text-xs text-[#52736a]">Loading flagged messages queue…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-2xl border border-[#f2c7c2] bg-[#fff7f5] p-6 text-center">
        <p className="text-sm font-semibold text-[#b42318]">
          {error instanceof Error ? error.message : "Failed to load flagged messages."}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 inline-flex rounded-xl bg-[#1f6a58] px-4 py-2 text-xs font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#ccdcd4] bg-[#fbfdfc] p-10 text-center">
        <div className="text-3xl" aria-hidden="true">
          ✅
        </div>
        <h3 className="mt-3 text-base font-bold text-[#06201c]">All Caught Up!</h3>
        <p className="mt-1 text-xs text-[#52736a]">
          There are no flagged discussion messages requiring admin review at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6a8a80]">
          Pending Review Queue ({items.length})
        </p>
        <span className="text-xs text-[#52736a]">
          AI-flagged items remain hidden from attendees until approved.
        </span>
      </div>

      {mutation.isError && (
        <div role="alert" className="rounded-xl border border-[#f2c7c2] bg-[#fff7f5] p-3 text-xs font-semibold text-[#b42318]">
          ⚠️ {mutation.error instanceof Error ? mutation.error.message : "Failed to perform moderation action."}
        </div>
      )}

      <div className="space-y-4">
        {items.map((item, index) => {
          const itemId = String(item.id || (item as unknown as Record<string, unknown>).message_id || "");
          const isHighlighted = Boolean(itemId && itemId === highlightMessageId);
          const isBusy = Boolean(itemId && actingId === itemId && mutation.isPending);

          const formattedDate = formatAuditDateTime(item.created_at);
          const displayDate = formattedDate === "Not provided" ? "Recently" : formattedDate;

          return (
            <article
              key={itemId || `queue-item-${index}`}
              id={itemId ? `flagged-card-${itemId}` : undefined}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                isHighlighted ? "border-[#e0b838] ring-2 ring-[#e0b838]" : "border-[#e1ebe6]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#06201c]">{item.sender_name}</span>
                    <span className="rounded-full bg-[#fff4d6] border border-[#fde293] px-2 py-0.5 text-[10px] font-bold uppercase text-[#805900]">
                      Pending Review
                    </span>
                    {item.is_appeal && (
                      <span className="rounded-full bg-[#f3edf7] border border-[#d8c2e7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#674482]">
                        🚩 User Appealed
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-[#6a8a80]">
                    Submitted {displayDate}
                  </time>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy || !itemId}
                    onClick={() => {
                      if (!itemId) return;
                      mutation.mutate({ messageId: itemId, action: "approve" });
                    }}
                    className="rounded-xl bg-[#1f6a58] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#185345] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58] disabled:opacity-50"
                  >
                    {isBusy ? "Processing…" : "Approve & Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || !itemId}
                    onClick={() => {
                      if (!itemId) return;
                      mutation.mutate({ messageId: itemId, action: "delete" });
                    }}
                    className="rounded-xl border border-[#f2c7c2] bg-[#fff7f5] px-3.5 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fee4e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] disabled:opacity-50"
                  >
                    Delete Message
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#f0f4f3] bg-[#fbfdfc] p-3 text-sm text-[#06201c] whitespace-pre-wrap">
                "{item.content}"
              </div>

              <div className="mt-4 rounded-xl border border-[#ffe0b2] bg-[#fffbf2] p-3 text-xs text-[#7a4e00] space-y-1">
                <p className="font-semibold">⚠️ AI Moderation Flag Details:</p>
                <p>{item.ai_flag_reason || "Flagged by discussion moderation policy"}</p>
                {Array.isArray(item.ai_categories) && item.ai_categories.length > 0 && (
                  <p className="text-[11px] text-[#9a6400]">
                    Categories: {item.ai_categories.join(", ")}
                    {typeof item.confidence === "number" && ` (Confidence: ${Math.round(item.confidence * 100)}%)`}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
