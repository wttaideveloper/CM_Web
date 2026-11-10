"use client";

import { useOptionalAuth } from "@ihp/auth";
import type { EventDiscussionMessage, EventDiscussionReply, EventDiscussionRole } from "./event-discussions.types";
import { resolveAuthorName } from "./event-discussions.service";

export interface MessageCardProps {
  message: EventDiscussionMessage | EventDiscussionReply;
  onReplyClick?: (message: EventDiscussionMessage | EventDiscussionReply) => void;
  isHighlighted?: boolean;
  showReplyCount?: boolean;
}

const roleBadgeClass: Record<EventDiscussionRole, string> = {
  enterprise_admin: "bg-[#e8f6ee] text-[#1f6a58] border-[#c0e4d4]",
  speaker: "bg-[#f3edf7] text-[#674482] border-[#e2d5ed]",
  registered_participant: "bg-[#f0f4f3] text-[#4b6a61] border-[#d8e3df]",
  super_admin: "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]",
};

const roleLabel: Record<EventDiscussionRole, string> = {
  enterprise_admin: "Admin",
  speaker: "Speaker",
  registered_participant: "Attendee",
  super_admin: "Super Admin",
};

/** Normalizes and resolves author role across all backend schema variations. */
function getRoleDetails(message: EventDiscussionMessage | EventDiscussionReply): {
  label: string;
  className: string;
} {
  const record = message as unknown as Record<string, unknown>;
  const authorObj = (record.author && typeof record.author === "object" ? record.author : {}) as Record<string, unknown>;
  const senderObj = (record.sender && typeof record.sender === "object" ? record.sender : {}) as Record<string, unknown>;
  const userObj = (record.user && typeof record.user === "object" ? record.user : {}) as Record<string, unknown>;

  const isAnnouncement = Boolean(message.is_announcement);
  const isAdmin = Boolean(
    record.is_admin ||
    record.is_enterprise_admin ||
    record.is_organizer ||
    authorObj.is_admin ||
    senderObj.is_admin ||
    userObj.is_admin
  );
  const isSuper = Boolean(record.is_super_admin || authorObj.is_super_admin);
  const isSpeaker = Boolean(record.is_speaker || authorObj.is_speaker);

  const rawRole = String(
    record.author_role ??
    record.role ??
    record.sender_role ??
    record.user_role ??
    authorObj.role ??
    senderObj.role ??
    userObj.role ??
    ""
  ).toLowerCase().trim();

  let resolvedRole: EventDiscussionRole = "registered_participant";
  if (isSuper || rawRole.includes("super")) {
    resolvedRole = "super_admin";
  } else if (
    isAnnouncement ||
    isAdmin ||
    rawRole.includes("admin") ||
    rawRole.includes("organizer") ||
    rawRole.includes("host") ||
    rawRole === "enterprise" ||
    rawRole === "enterprise_admin"
  ) {
    resolvedRole = "enterprise_admin";
  } else if (isSpeaker || rawRole.includes("speaker") || rawRole.includes("presenter")) {
    resolvedRole = "speaker";
  }

  return {
    label: roleLabel[resolvedRole] ?? "Attendee",
    className: roleBadgeClass[resolvedRole] ?? roleBadgeClass.registered_participant,
  };
}

function parseBackendTimestamp(value: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = parseBackendTimestamp(dateString);
    const timestamp = date.getTime();
    if (Number.isNaN(timestamp)) return "Recent";
    const elapsedSeconds = Math.round((Date.now() - timestamp) / 1000);
    if (elapsedSeconds < 60) return "Just now";
    if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
    if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  } catch {
    return "Recent";
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * MessageCard
 *
 * Displays a single discussion message or reply with sanitized content,
 * author identity, announcement highlighting, and moderation status pills.
 */
export function MessageCard({ message, onReplyClick, isHighlighted = false, showReplyCount = true }: MessageCardProps) {
  const auth = useOptionalAuth();
  const currentUser = auth?.user;
  const replyCount = "reply_count" in message ? (message.reply_count ?? 0) : 0;
  const isPending = message.moderation_status === "pending_review";
  const roleInfo = getRoleDetails(message);

  const currentUserId = currentUser?.userId ?? currentUser?.id;
  const isAuthorCurrentUser = Boolean(
    currentUserId && message.author_id && String(message.author_id) === String(currentUserId)
  );
  const currentUserName = currentUser?.fullName;

  const authorName = resolveAuthorName(
    message as unknown as Record<string, unknown>,
    isAuthorCurrentUser && currentUserName ? currentUserName : (message.author_name || roleInfo.label)
  );

  const avatarUrl = message.author_avatar_url || null;
  const initials = getInitials(authorName);

  return (
    <article
      id={`discussion-msg-${message.id}`}
      tabIndex={isHighlighted ? -1 : undefined}
      className={`rounded-2xl border transition-all duration-300 p-4 ${
        message.is_announcement
          ? "border-[#b8ddcb] bg-[#f4faf7] shadow-sm"
          : "border-[#e1ebe6] bg-white hover:border-[#ccdcd4]"
      } ${isHighlighted ? "ring-2 ring-[#1f6a58] ring-offset-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-full object-cover border border-[#d7e5df]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]"
            >
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#06201c]">{authorName}</span>
              {isAuthorCurrentUser ? (
                <span className="text-[11px] font-medium text-[#6a8a80]">(You)</span>
              ) : null}
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleInfo.className}`}
              >
                {roleInfo.label}
              </span>
            </div>
            <time dateTime={message.created_at} className="text-xs text-[#6a8a80]">
              {formatRelativeTime(message.created_at)}
            </time>
          </div>
        </div>

        {message.is_announcement && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#1f6a58] px-2.5 py-0.5 text-xs font-semibold text-white">
            📢 Announcement
          </span>
        )}

        {isPending && (
          <span
            role="status"
            className="inline-flex items-center gap-1 rounded-full bg-[#fff4d6] border border-[#fde293] px-2.5 py-0.5 text-xs font-semibold text-[#805900]"
          >
            ⏳ Pending Admin Review
          </span>
        )}
      </div>

      <div className="mt-3 text-sm leading-6 text-[#183d32] whitespace-pre-wrap break-words">
        {message.content}
      </div>

      {isPending && message.moderation_reason && (
        <p className="mt-2 text-xs italic text-[#a37000]">
          Note: {message.moderation_reason}
        </p>
      )}

      {onReplyClick && (
        <div className="mt-3 flex items-center justify-between border-t border-[#edf3f0] pt-2.5">
          <button
            type="button"
            onClick={() => onReplyClick(message)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f6a58] hover:text-[#185345] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"
          >
            <span>💬</span>
            {showReplyCount && replyCount > 0 ? (
              <span>
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </span>
            ) : (
              <span>Reply</span>
            )}
          </button>
        </div>
      )}
    </article>
  );
}
