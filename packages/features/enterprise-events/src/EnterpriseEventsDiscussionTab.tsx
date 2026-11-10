"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DiscussionFeed } from "./DiscussionFeed";
import { AdminFlaggedQueue } from "./AdminFlaggedQueue";
import { getEventDiscussionAccess, listEventFlaggedDiscussions } from "./event-discussions.service";

export interface EnterpriseEventsDiscussionTabProps {
  eventId: string;
  initialSubview?: "feed" | "flagged";
  initialMessageId?: string | null;
  initialReplyId?: string | null;
}

/**
 * EnterpriseEventsDiscussionTab
 *
 * Primary Enterprise Admin container for managing an Event's discussions,
 * toggling between the active conversation feed and the flagged review queue.
 */
export function EnterpriseEventsDiscussionTab({
  eventId,
  initialSubview = "feed",
  initialMessageId,
  initialReplyId,
}: EnterpriseEventsDiscussionTabProps) {
  const [subview, setSubview] = useState<"feed" | "flagged">(initialSubview);

  const accessQuery = useQuery({
    queryKey: ["discussions", "access", eventId],
    queryFn: () => getEventDiscussionAccess(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
  });

  const flaggedQuery = useQuery({
    queryKey: ["discussions", "flagged", eventId],
    queryFn: () => listEventFlaggedDiscussions(eventId),
    enabled: Boolean(eventId),
    staleTime: 20_000,
  });

  const pendingCount = flaggedQuery.data?.total_pending ?? flaggedQuery.data?.items.length ?? 0;
  const canRead = accessQuery.data?.can_read ?? true;
  const canPost = accessQuery.data?.can_post ?? true;
  const lockedReason = accessQuery.data?.locked_reason;

  if (accessQuery.isSuccess && !canRead) {
    return (
      <div className="rounded-2xl border border-dashed border-[#ccdcd4] bg-[#fbfdfc] p-10 text-center space-y-3">
        <div className="text-3xl" aria-hidden="true">🔒</div>
        <h3 className="text-base font-bold text-[#06201c]">Discussions Locked</h3>
        <p className="text-xs text-[#52736a] max-w-md mx-auto">
          {lockedReason === "NOT_REGISTERED"
            ? "This discussion area is exclusive to registered attendees. Please register for this event to view and join discussions."
            : lockedReason === "REGISTRATION_CANCELLED"
            ? "Your registration for this event was cancelled. Access to discussions is locked."
            : lockedReason === "NOT_SIGNED_IN"
            ? "Please sign in to view and participate in event discussions."
            : accessQuery.data?.message || "Discussions are currently locked for this event."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e1ebe6] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#06201c]">Event Discussions</h2>
          <p className="text-xs text-[#52736a]">
            Communicate with registered participants and review AI-flagged messages.
          </p>
        </div>

        <nav aria-label="Discussion views" className="flex items-center gap-2 rounded-xl bg-[#f0f4f3] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSubview("feed")}
            className={`rounded-lg px-3.5 py-2 transition ${
              subview === "feed"
                ? "bg-white text-[#1f6a58] shadow-sm font-bold"
                : "text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Discussion Feed
          </button>
          <button
            type="button"
            onClick={() => setSubview("flagged")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${
              subview === "flagged"
                ? "bg-white text-[#1f6a58] shadow-sm font-bold"
                : "text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            <span>Flagged for Review</span>
            {pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fde293] px-1 text-[11px] font-bold text-[#805900]">
                {pendingCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {subview === "feed" ? (
        <DiscussionFeed
          eventId={eventId}
          isAdmin={true}
          canPost={canPost}
          lockedReason={lockedReason}
          initialMessageId={initialMessageId}
          initialReplyId={initialReplyId}
        />
      ) : (
        <AdminFlaggedQueue
          eventId={eventId}
          highlightMessageId={initialMessageId}
        />
      )}
    </div>
  );
}
