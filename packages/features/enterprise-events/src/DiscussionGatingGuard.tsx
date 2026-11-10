"use client";

import { useQuery } from "@tanstack/react-query";
import { getEventDiscussionAccess } from "./event-discussions.service";
import type { EventDiscussionAccess } from "./event-discussions.types";

export interface DiscussionGatingGuardProps {
  eventId: string;
  children: React.ReactNode;
  onRegisterClick?: () => void;
}

/**
 * DiscussionGatingGuard
 *
 * Verifies event registration and authorization before unlocking discussions.
 * Renders an accessible locked screen with an event registration CTA when
 * the attendee is not yet registered.
 */
export function DiscussionGatingGuard({ eventId, children, onRegisterClick }: DiscussionGatingGuardProps) {
  const { data: access, isLoading, isError, error, refetch } = useQuery<EventDiscussionAccess>({
    queryKey: ["discussions", "access", eventId],
    queryFn: () => getEventDiscussionAccess(eventId),
    enabled: Boolean(eventId),
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="space-y-4 rounded-2xl border border-[#e1ebe6] bg-white p-6">
        <div className="h-6 w-1/3 animate-pulse rounded bg-[#edf3f0]" />
        <div className="h-20 animate-pulse rounded-xl bg-[#edf3f0]" />
        <p className="text-xs text-[#52736a]">Verifying discussion access permissions…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-2xl border border-[#f2c7c2] bg-[#fff7f5] p-6 text-center">
        <p className="font-semibold text-[#b42318]">
          {error instanceof Error ? error.message : "Unable to verify event registration status."}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 inline-flex rounded-xl bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185345] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"
        >
          Retry Access Check
        </button>
      </div>
    );
  }

  const isEligible = access?.can_read || access?.can_access || access?.is_admin || access?.is_registered;

  if (!isEligible) {
    const isCancelled = access?.locked_reason === "REGISTRATION_CANCELLED";
    return (
      <section
        aria-labelledby="discussion-locked-heading"
        className="flex flex-col items-center justify-center rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] px-6 py-12 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f6ee] text-2xl text-[#1f6a58]" aria-hidden="true">
          🔒
        </div>
        <h3 id="discussion-locked-heading" className="mt-4 text-xl font-bold text-[#06201c]">
          {isCancelled ? "Registration Cancelled" : "Event Discussion Locked"}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#52736a]">
          {access?.message ||
            (isCancelled
              ? "Your registration for this event was cancelled, and discussion access has been revoked."
              : "Join the conversation! This discussion is reserved for registered participants and authorized event organizers. Register for the event to ask questions, read announcements, and network.")}
        </p>
        {onRegisterClick && !isCancelled && (
          <button
            type="button"
            onClick={onRegisterClick}
            className="mt-6 rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#185345] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"
          >
            Register for Event
          </button>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {access?.is_discussion_locked && (
        <div role="status" className="rounded-xl border border-[#fef0c7] bg-[#fffcf5] p-3 text-xs font-medium text-[#7a4e00]">
          ℹ️ {access.message || "This event discussion has concluded and is now read-only. New messages cannot be submitted."}
        </div>
      )}
      {children}
    </div>
  );
}
