"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  appealEventDiscussionMessage,
  createEventDiscussion,
  createEventDiscussionReply,
  editEventDiscussionMessage,
} from "./event-discussions.service";
import type { CreateDiscussionResponse } from "./event-discussions.types";

export interface MessageComposerProps {
  eventId: string;
  parentMessageId?: string | null;
  isAdmin?: boolean;
  canPost?: boolean;
  lockedReason?: string | null;
  onSuccess?: (response: CreateDiscussionResponse) => void;
  placeholder?: string;
}

const MAX_CHARACTERS = 2000;

/**
 * MessageComposer
 *
 * Input form for new discussions and replies with client-side length limits,
 * admin announcement toggles, 3-tier AI moderation handling, and appeals.
 */
export function MessageComposer({
  eventId,
  parentMessageId,
  isAdmin = false,
  canPost = true,
  lockedReason,
  onSuccess,
  placeholder = "Ask a question or share a thought…",
}: MessageComposerProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [blockedMessageId, setBlockedMessageId] = useState<string | null>(null);
  const [isAppealing, setIsAppealing] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{
    type: "pending" | "blocked" | "error";
    message: string;
  } | null>(null);

  if (!canPost) {
    return (
      <div className="rounded-2xl border border-[#e1ebe6] bg-[#f8faf9] p-4 text-center">
        <p className="text-xs font-semibold text-[#52736a]">
          {lockedReason === "NOT_REGISTERED"
            ? "Discussions are only open to registered attendees."
            : lockedReason === "REGISTRATION_CANCELLED"
            ? "Registration cancelled. Discussion posting is locked."
            : "Discussion posting is locked for this event."}
        </p>
      </div>
    );
  }

  const mutation = useMutation({
    mutationFn: async () => {
      setBannerNotice(null);
      const editingId = blockedMessageId;
      setBlockedMessageId(null);
      if (editingId) {
        return editEventDiscussionMessage(eventId, editingId, content);
      }
      if (parentMessageId) {
        return createEventDiscussionReply(eventId, parentMessageId, { content });
      }
      return createEventDiscussion(eventId, { content, is_announcement: isAnnouncement });
    },
    onSuccess: (result) => {
      if (result.status === "blocked") {
        setBlockedMessageId(result.message_id ?? null);
        setBannerNotice({
          type: "blocked",
          message: result.user_message || result.display_notice || "Your message violates community guidelines and cannot be posted.",
        });
        return;
      }

      if (result.status === "pending_review" || result.status === "pending_moderation") {
        setBannerNotice({
          type: "pending",
          message: result.user_message || result.display_notice || (result.status === "pending_moderation" ? "Your message is pending moderation and will be published once verified." : "Your message is pending admin review."),
        });
        setContent("");
        setIsAnnouncement(false);
        void queryClient.invalidateQueries({ queryKey: ["discussions", "list", eventId] });
        onSuccess?.(result);
        return;
      }

      setContent("");
      setIsAnnouncement(false);
      setBannerNotice(null);
      void queryClient.invalidateQueries({ queryKey: ["discussions", "list", eventId] });
      if (parentMessageId) {
        void queryClient.invalidateQueries({ queryKey: ["discussions", "thread", eventId, parentMessageId] });
      }
      onSuccess?.(result);
    },
    onError: (err) => {
      setBannerNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to post message. Please try again.",
      });
    },
  });

  const handleAppeal = async () => {
    if (!blockedMessageId || isAppealing) return;
    try {
      setIsAppealing(true);
      const res = await appealEventDiscussionMessage(eventId, blockedMessageId);
      setBannerNotice({
        type: "pending",
        message: res.message,
      });
      setBlockedMessageId(null);
      setContent("");
      void queryClient.invalidateQueries({ queryKey: ["discussions", "list", eventId] });
    } catch (err) {
      setBannerNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to submit appeal.",
      });
    } finally {
      setIsAppealing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || mutation.isPending) return;
    mutation.mutate();
  };

  const remainingChars = MAX_CHARACTERS - content.length;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm space-y-3">
      {bannerNotice && (
        <div
          role={bannerNotice.type === "blocked" || bannerNotice.type === "error" ? "alert" : "status"}
          className={`rounded-xl border p-3 text-sm ${
            bannerNotice.type === "blocked"
              ? "border-[#f8b4ad] bg-[#fff5f5] text-[#b42318] font-medium"
              : bannerNotice.type === "pending"
              ? "border-[#fde293] bg-[#fffcf5] text-[#805900] font-medium"
              : "border-[#f2c7c2] bg-[#fff7f5] text-[#b42318]"
          }`}
        >
          <div>
            {bannerNotice.type === "blocked" && "🚫 "}
            {bannerNotice.type === "pending" && "⏳ "}
            {bannerNotice.message}
          </div>
          {bannerNotice.type === "blocked" && blockedMessageId && (
            <div className="mt-2 pt-2 border-t border-[#fbd0cb]">
              <button
                type="button"
                disabled={isAppealing}
                onClick={handleAppeal}
                className="text-xs font-bold text-[#b42318] underline hover:text-[#7a1910] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318]"
              >
                {isAppealing ? "Submitting Appeal…" : "Think this was a mistake? Click here to request manual organizer review (Appeal)"}
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor={`composer-${parentMessageId ?? "root"}`} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={`composer-${parentMessageId ?? "root"}`}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARACTERS))}
          placeholder={placeholder}
          rows={parentMessageId ? 2 : 3}
          disabled={mutation.isPending}
          className={`w-full rounded-xl border p-3 text-sm text-[#06201c] placeholder-[#6a8a80] transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            bannerNotice?.type === "blocked"
              ? "border-[#f8b4ad] focus:border-[#b42318] focus:ring-[#b42318]"
              : "border-[#d7e5df] focus:border-[#1f6a58] focus:ring-[#1f6a58]"
          }`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-4">
          <span
            aria-live="polite"
            className={`text-xs ${remainingChars < 100 ? "font-bold text-[#b42318]" : "text-[#6a8a80]"}`}
          >
            {remainingChars} characters remaining
          </span>

          {isAdmin && !parentMessageId && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#1f6a58]">
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#c8d9d1] text-[#1f6a58] focus:ring-[#1f6a58]"
              />
              <span>Post as Announcement</span>
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={!content.trim() || mutation.isPending}
          className="inline-flex items-center justify-center rounded-xl bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#185345] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Submitting…" : parentMessageId ? "Post Reply" : "Post Question"}
        </button>
      </div>
    </form>
  );
}
