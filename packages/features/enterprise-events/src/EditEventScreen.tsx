"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import CreateEventScreen from "./CreateEventScreen";
import { canEditEvent } from "./event-status";
import { EventsApiError, getEventById } from "./events.service";

/** Loads an Event and renders the shared editor in edit mode. */
export default function EditEventScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const eventQuery = useQuery({
    queryKey: ["events", "detail", eventId],
    queryFn: () => getEventById(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });

  if (eventQuery.isLoading || !eventQuery.data && !eventQuery.isError) {
    return <EditEventSkeleton />;
  }

  if (eventQuery.isError) {
    return <EditEventError error={eventQuery.error} retry={() => void eventQuery.refetch()} />;
  }

  if (!canEditEvent(eventQuery.data.status)) {
    return <EditEventUnavailable eventId={eventQuery.data.id} />;
  }

  return <CreateEventScreen mode="edit" initialEvent={eventQuery.data} />;
}

function EditEventSkeleton() {
  return <div className="animate-pulse"><div className="h-32 rounded-2xl bg-[#edf3f0]" /><div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><div className="h-72 rounded-2xl bg-[#f1f4f3]" /><div className="h-[34rem] rounded-2xl bg-[#f1f4f3]" /></div></div>;
}

function EditEventError({ error, retry }: { error: Error; retry: () => void }) {
  const status = error instanceof EventsApiError ? error.status : null;
  const message = status === 404 ? "This event no longer exists." : status === 401 || status === 403 ? "You do not have access to edit this event." : "Unable to load the event for editing.";

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">{message}</p><div className="mt-4 flex justify-center gap-4"><Link href="/admin/events" className="text-sm font-semibold text-[#1f6a58] underline">Back to Events</Link><button type="button" onClick={retry} className="text-sm font-semibold text-[#1f6a58] underline">Try again</button></div></section>;
}

/** Explains why direct navigation cannot bypass the draft-only edit policy. */
function EditEventUnavailable({ eventId }: { eventId: string }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">Only draft events can be edited.</p><Link href={`/admin/events/${eventId}`} className="mt-4 inline-block text-sm font-semibold text-[#1f6a58] underline">Back to Event</Link></section>;
}
