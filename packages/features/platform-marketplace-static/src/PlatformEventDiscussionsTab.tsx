"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getEventDiscussionModerationHistory,
  listEventDiscussions,
  type EventDiscussionMessage,
  type EventModerationAuditEntry,
} from "@ihp/enterprise-events";

export interface PlatformEventDiscussionsTabProps {
  eventId: string;
  initialMessageId?: string | null;
}

const auditActionBadge: Record<string, { label: string; class: string }> = {
  ai_approved: { label: "AI Approved", class: "bg-[#e8f6ee] text-[#1f6a58] border-[#c0e4d4]" },
  ai_flagged: { label: "AI Flagged", class: "bg-[#fff4d6] text-[#805900] border-[#fde293]" },
  ai_blocked: { label: "AI Blocked", class: "bg-[#fff1ef] text-[#b42318] border-[#f2c7c2]" },
  admin_approved: { label: "Admin Approved", class: "bg-[#e8f6ee] text-[#1f6a58] border-[#c0e4d4]" },
  admin_deleted: { label: "Admin Deleted", class: "bg-[#f8f9fa] text-[#555] border-[#ddd]" },
};

/**
 * PlatformEventDiscussionsTab
 *
 * Provides Super Admin / Platform Admin read-only oversight across event
 * discussions, including AI content moderation decisions and Enterprise Admin actions.
 */
export function PlatformEventDiscussionsTab({ eventId, initialMessageId }: PlatformEventDiscussionsTabProps) {
  const [subview, setSubview] = useState<"discussions" | "audit">("discussions");

  const discussionsQuery = useQuery({
    queryKey: ["platform", "event-discussions", eventId],
    queryFn: () => listEventDiscussions(eventId, "all"),
    enabled: Boolean(eventId),
    staleTime: 30_000,
  });

  const auditQuery = useQuery({
    queryKey: ["platform", "event-discussions-audit", eventId],
    queryFn: () => getEventDiscussionModerationHistory(eventId),
    enabled: Boolean(eventId) && subview === "audit",
    staleTime: 30_000,
  });

  const messages = discussionsQuery.data?.items ?? [];
  const auditEntries = auditQuery.data ?? [];

  return (
    <section aria-labelledby="super-admin-discussions-title" className="mt-6 rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e1ebe6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 id="super-admin-discussions-title" className="text-base font-bold text-[#06201c]">
              Event Discussions Oversight
            </h3>
            <span className="rounded-full bg-[#f0f4f3] border border-[#d8e3df] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4b6a61]">
              Read-Only
            </span>
          </div>
          <p className="mt-1 text-xs text-[#52736a]">
            Platform monitoring of attendee conversations and AI moderation actions.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[#f0f4f3] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSubview("discussions")}
            className={`rounded-lg px-3 py-1.5 transition ${
              subview === "discussions" ? "bg-white text-[#1f6a58] shadow-sm font-bold" : "text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Discussions ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setSubview("audit")}
            className={`rounded-lg px-3 py-1.5 transition ${
              subview === "audit" ? "bg-white text-[#1f6a58] shadow-sm font-bold" : "text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Moderation History
          </button>
        </div>
      </div>

      <div role="status" className="rounded-xl border border-[#d7e5df] bg-white p-3 text-xs text-[#31594d]">
        🛡️ <span className="font-semibold">Super Admin Notice:</span> Discussion posting, replying, and moderation approval/deletion are restricted to authorized Enterprise Admins and registered attendees.
      </div>

      {subview === "discussions" ? (
        <div className="space-y-4">
          {discussionsQuery.isLoading ? (
            <div role="status" className="space-y-3">
              <div className="h-20 animate-pulse rounded-xl bg-[#edf3f0]" />
              <div className="h-20 animate-pulse rounded-xl bg-[#edf3f0]" />
              <p className="text-xs text-[#52736a]">Loading discussion activity…</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-[#52736a] py-6">
              No discussion activity recorded for this event.
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border bg-white p-4 ${
                    item.id === initialMessageId ? "border-[#1f6a58] ring-2 ring-[#1f6a58]" : "border-[#e1ebe6]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[#6a8a80]">
                    <span className="font-bold text-[#06201c]">{item.author_name}</span>
                    <time dateTime={item.created_at}>
                      {new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}
                    </time>
                  </div>
                  <p className="mt-2 text-sm text-[#183d32]">{item.content}</p>
                  {item.reply_count > 0 && (
                    <p className="mt-2 text-xs font-semibold text-[#1f6a58]">
                      💬 {item.reply_count} {item.reply_count === 1 ? "reply" : "replies"}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {auditQuery.isLoading ? (
            <div role="status" className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-[#edf3f0]" />
              <div className="h-16 animate-pulse rounded-xl bg-[#edf3f0]" />
              <p className="text-xs text-[#52736a]">Loading moderation history…</p>
            </div>
          ) : auditEntries.length === 0 ? (
            <p className="text-center text-xs text-[#52736a] py-6">
              No moderation audit entries found for this event.
            </p>
          ) : (
            <div className="space-y-3">
              {auditEntries.map((entry) => {
                const badge = auditActionBadge[entry.action] ?? { label: entry.action, class: "bg-gray-100 text-gray-700" };
                return (
                  <div key={entry.id} className="rounded-xl border border-[#e1ebe6] bg-white p-4 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full border px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] ${badge.class}`}>
                        {badge.label}
                      </span>
                      <time className="text-[#6a8a80]">
                        {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.created_at))}
                      </time>
                    </div>
                    <p className="text-[#06201c]">
                      <span className="font-semibold">Author:</span> {entry.author_name} · <span className="font-semibold">Action by:</span> {entry.action_by_name}
                    </p>
                    <p className="italic text-[#52736a]">"{entry.message_content_snapshot}"</p>
                    {entry.reason && (
                      <p className="text-[#a37000]">
                        <span className="font-semibold">Reason:</span> {entry.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
