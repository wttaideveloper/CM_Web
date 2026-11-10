"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getPublishedEventDetails } from "./platform-events.service";
import { PlatformModuleReviewsTab } from "./PlatformModuleReviewsTab";
import { DiscussionFeed, DiscussionGatingGuard } from "@ihp/enterprise-events";

/**
 * PlatformEventDetailsScreen
 *
 * Attendee-facing event details view with registration gating and embedded
 * Event Discussions feed and threaded conversation support.
 */
export default function PlatformEventDetailsScreen() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const eventId = params?.eventId ?? "";

  const initialTab = searchParams.get("tab") === "discussion" ? "discussion" : searchParams.get("tab") === "reviews" ? "reviews" : "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "discussion" | "reviews">(initialTab);

  const initialMessageId = searchParams.get("message_id") ?? searchParams.get("messageId");
  const initialReplyId = searchParams.get("reply_id") ?? searchParams.get("replyId");

  const query = useQuery({
    queryKey: ["events", "published-detail", eventId],
    queryFn: () => getPublishedEventDetails(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });

  const event = query.data;

  if (query.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-[#edf3f0]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[#edf3f0]" />
        <p className="text-sm text-[#52736a]">Loading event details…</p>
      </main>
    );
  }

  if (query.isError || !event) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div role="alert" className="rounded-2xl border border-[#f2c7c2] bg-[#fff7f5] p-6 text-center">
          <p className="font-semibold text-[#b42318]">
            {query.error instanceof Error ? query.error.message : "Unable to load event."}
          </p>
          <Link href="/events" className="mt-3 inline-block font-semibold text-[#1f6a58] underline">
            Back to All Events
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <nav aria-label="Breadcrumbs" className="text-xs text-[#52736a]">
        <Link href="/events" className="hover:underline">Events</Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-[#06201c]">{event.title}</span>
      </nav>

      <header className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58] uppercase tracking-wider">
              {event.category || "Event"}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-[#06201c]">{event.title}</h1>
            <p className="mt-1 text-xs text-[#52736a]">
              Organized by <span className="font-medium text-[#06201c]">{event.enterprise_name || event.organiser_name || "Enterprise Host"}</span>
            </p>
          </div>
          {event.price && (
            <div className="rounded-xl border border-[#d7e5df] bg-[#fbfdfc] px-4 py-2 text-right">
              <span className="text-xs text-[#6a8a80]">Registration</span>
              <p className="text-lg font-bold text-[#1f6a58]">{event.price} {event.currency ?? "USD"}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 border-b border-[#e1ebe6] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-4 py-2.5 transition ${
              activeTab === "overview"
                ? "border-[#1f6a58] text-[#1f6a58]"
                : "border-transparent text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("discussion")}
            className={`border-b-2 px-4 py-2.5 transition ${
              activeTab === "discussion"
                ? "border-[#1f6a58] text-[#1f6a58]"
                : "border-transparent text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Discussions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`border-b-2 px-4 py-2.5 transition ${
              activeTab === "reviews"
                ? "border-[#1f6a58] text-[#1f6a58]"
                : "border-transparent text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Reviews
          </button>
        </div>
      </header>

      {activeTab === "overview" && (
        <section aria-labelledby="event-overview-heading" className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm space-y-4">
          <h2 id="event-overview-heading" className="text-lg font-bold text-[#06201c]">About This Event</h2>
          <p className="text-sm leading-6 text-[#183d32] whitespace-pre-wrap">
            {event.description || "No description provided."}
          </p>
          {event.start_date && (
            <p className="text-xs text-[#52736a]">
              <span className="font-semibold text-[#06201c]">Starts:</span> {new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(new Date(event.start_date))}
            </p>
          )}
        </section>
      )}

      {activeTab === "discussion" && (
        <DiscussionGatingGuard eventId={eventId}>
          <DiscussionFeed
            eventId={eventId}
            isAdmin={false}
            initialMessageId={initialMessageId}
            initialReplyId={initialReplyId}
          />
        </DiscussionGatingGuard>
      )}

      {activeTab === "reviews" && (
        <div className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
          <PlatformModuleReviewsTab module="event" itemId={eventId} />
        </div>
      )}
    </main>
  );
}
