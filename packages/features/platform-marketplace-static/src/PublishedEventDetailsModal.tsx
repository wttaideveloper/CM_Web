"use client";

import { protectedMediaPreviewUrl } from "@ihp/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { getPublishedEventDetails, type EventDocument, type EventSession, type PublishedEventDetails } from "./platform-events.service";

type PublishedEventDetailsModalProps = { eventId: string; onClose: () => void };

function valueOrMissing(value: string | null | undefined): string {
  return value?.trim() || "Not provided";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatEventType(value: PublishedEventDetails["event_type"]): string {
  if (typeof value === "string") return value;
  return value?.name || value?.key || "Not provided";
}

function fieldLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] p-4"><h3 className="text-base font-bold text-[#06201c]">{title}</h3><div className="mt-3">{children}</div></section>;
}

function DetailsGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>;
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#6a8a80]">{label}</dt><dd className="mt-1 break-words text-sm text-[#183d32]">{value}</dd></div>;
}

function PreviewImage({ value, alt }: { value: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const url = protectedMediaPreviewUrl(value, "/api/platform-super-admin/event-media");
  if (failed) return <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[#c8d9d1] bg-white p-3 text-center text-xs text-[#52736a]">Preview could not be loaded.</div>;
  return <img src={url} alt={alt} onError={() => setFailed(true)} className="h-32 w-full rounded-xl border border-[#d7e5df] bg-white object-cover" />;
}

function DocumentLink({ value }: { value: EventDocument }) {
  const url = typeof value === "string" ? value : value.url;
  const name = typeof value === "string" ? (url.split("/").pop() || "Open document") : value.name || (url.split("/").pop() || "Open document");
  return <li><a href={protectedMediaPreviewUrl(url, "/api/platform-super-admin/event-media")} target="_blank" rel="noreferrer" className="font-semibold text-[#1f6a58] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">{name}</a></li>;
}

function MediaSection({ event }: { event: PublishedEventDetails }) {
  const images = [event.primary_image, ...(event.gallery_images ?? [])].filter((value): value is string => Boolean(value?.trim()));
  const videos = (event.videos ?? []).filter((value): value is string => Boolean(value?.trim()));
  const documents = event.documents ?? [];
  const hasMedia = images.length > 0 || videos.length > 0 || documents.length > 0;
  return <Section title="Media">{!hasMedia ? <p className="text-sm text-[#52736a]">No media provided.</p> : <div className="space-y-5">
    {images.length > 0 ? <div><h4 className="text-sm font-semibold text-[#31594d]">Images</h4><div className="mt-2 grid gap-3 sm:grid-cols-3">{images.map((value, index) => <a key={`${value}-${index}`} href={protectedMediaPreviewUrl(value, "/api/platform-super-admin/event-media")} target="_blank" rel="noreferrer" className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"><PreviewImage value={value} alt={index === 0 ? "Primary Event image" : `Event gallery image ${index}`} /></a>)}</div></div> : null}
    {videos.length > 0 ? <div><h4 className="text-sm font-semibold text-[#31594d]">Videos</h4><div className="mt-2 space-y-3">{videos.map((value, index) => <video key={`${value}-${index}`} controls preload="metadata" className="max-h-64 w-full rounded-xl bg-black" src={protectedMediaPreviewUrl(value, "/api/platform-super-admin/event-media")}><p className="p-3 text-sm text-white">This video could not be loaded.</p></video>)}</div></div> : null}
    {documents.length > 0 ? <div><h4 className="text-sm font-semibold text-[#31594d]">Documents</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{documents.map((value, index) => <DocumentLink key={`${typeof value === "string" ? value : value.url}-${index}`} value={value} />)}</ul></div> : null}
  </div>}</Section>;
}

function SessionCard({ session }: { session: EventSession }) {
  return <li className="rounded-xl border border-[#e1ebe6] bg-white p-3"><p className="font-semibold text-[#183d32]">{session.title}</p><DetailsGrid><DetailField label="Date" value={valueOrMissing(session.session_date)} /><DetailField label="Time" value={[session.start_time, session.end_time].filter(Boolean).join(" – ") || "Not provided"} /><DetailField label="Speaker" value={valueOrMissing(session.speaker)} /><DetailField label="Location" value={valueOrMissing(session.location)} /></DetailsGrid>{session.description ? <p className="mt-3 text-sm text-[#52736a]">{session.description}</p> : null}{session.meeting_link ? <a href={session.meeting_link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#1f6a58] underline">Open session meeting</a> : null}</li>;
}

function EventDetailContent({ event }: { event: PublishedEventDetails }) {
  const modules = event.modules ? Object.entries(event.modules) : [];
  return <div className="space-y-4">
    <Section title="Overview"><DetailsGrid><DetailField label="Title" value={event.title} /><DetailField label="Event type" value={formatEventType(event.event_type)} /><DetailField label="Category" value={event.category} /><DetailField label="Subcategory" value={valueOrMissing(event.subcategory)} /><DetailField label="Status" value={valueOrMissing(event.status)} /><DetailField label="Lifecycle" value={valueOrMissing(event.lifecycle_state)} /></DetailsGrid>{event.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#31594d]">{event.description}</p> : null}{event.tags?.length ? <p className="mt-3 text-sm text-[#52736a]"><span className="font-semibold text-[#31594d]">Tags: </span>{event.tags.join(", ")}</p> : null}</Section>
    <Section title="Enterprise ownership"><DetailsGrid><DetailField label="Enterprise" value={valueOrMissing(event.enterprise_name)} /><DetailField label="Enterprise ID" value={valueOrMissing(event.enterprise_id)} /></DetailsGrid></Section>
    <Section title="Schedule & registration"><DetailsGrid><DetailField label="Starts" value={formatDateTime(event.start_date)} /><DetailField label="Ends" value={formatDateTime(event.end_date)} /><DetailField label="Time zone" value={valueOrMissing(event.time_zone)} /><DetailField label="Registration cutoff" value={formatDateTime(event.registration_cutoff)} /><DetailField label="Registration opens" value={formatDateTime(event.registration_open_at)} /><DetailField label="Registration closes" value={formatDateTime(event.registration_close_at)} /></DetailsGrid></Section>
    <Section title="Delivery, venue & meeting"><DetailsGrid><DetailField label="Delivery mode" value={valueOrMissing(event.delivery_mode)} /><DetailField label="Venue" value={valueOrMissing(event.venue?.name)} /><DetailField label="Address" value={valueOrMissing(event.venue?.address)} /><DetailField label="City" value={valueOrMissing(event.venue?.city)} /><DetailField label="Meeting provider" value={valueOrMissing(event.meeting_provider)} /><DetailField label="Meeting link" value={event.meeting_link ? <a href={event.meeting_link} target="_blank" rel="noreferrer" className="text-[#1f6a58] underline">Open meeting</a> : "Not provided"} /></DetailsGrid></Section>
    <Section title="Organizer"><DetailsGrid><DetailField label="Name" value={valueOrMissing(event.organiser_name)} /><DetailField label="Contact" value={valueOrMissing(event.organiser_contact)} /></DetailsGrid></Section>
    <Section title="Pricing, capacity & registration"><DetailsGrid><DetailField label="Price" value={[event.price, event.currency].filter(Boolean).join(" ") || "Not provided"} /><DetailField label="Capacity" value={valueOrMissing(event.capacity)} /><DetailField label="Minimum participants" value={valueOrMissing(event.min_participants)} /><DetailField label="Maximum participants" value={valueOrMissing(event.max_participants)} /></DetailsGrid>{event.ticket_types?.length ? <div className="mt-4 space-y-2"><h4 className="text-sm font-semibold text-[#31594d]">Ticket types</h4>{event.ticket_types.map((ticket, index) => <div key={`${ticket.id ?? ticket.name}-${index}`} className="rounded-xl border border-[#e1ebe6] bg-white p-3 text-sm"><span className="font-semibold text-[#183d32]">{ticket.name}</span><span className="ml-3 text-[#52736a]">{[ticket.price, ticket.currency].filter(Boolean).join(" ") || "Price not provided"}</span>{ticket.capacity ? <span className="ml-3 text-[#52736a]">Capacity: {ticket.capacity}</span> : null}</div>)}</div> : null}</Section>
    <Section title="Sessions">{event.sessions?.length ? <ol className="space-y-2">{event.sessions.map((session, index) => <SessionCard key={`${session.id ?? session.title}-${index}`} session={session} />)}</ol> : <p className="text-sm text-[#52736a]">No sessions provided.</p>}</Section>
    <MediaSection event={event} />
    <Section title="Enabled modules">{modules.length ? <ul className="grid gap-2 sm:grid-cols-2">{modules.map(([key, enabled]) => <li key={key} className="flex items-center justify-between rounded-xl border border-[#e1ebe6] bg-white px-3 py-2 text-sm"><span>{fieldLabel(key)}</span><span className={enabled ? "font-semibold text-[#1f6a58]" : "text-[#6a8a80]"}>{enabled ? "Enabled" : "Disabled"}</span></li>)}</ul> : <p className="text-sm text-[#52736a]">Module configuration not provided.</p>}</Section>
  </div>;
}

/** Read-only Event dossier for the Super Admin published catalogue. */
export default function PublishedEventDetailsModal({ eventId, onClose }: PublishedEventDetailsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const query = useQuery({ queryKey: ["platform", "published-event-details", eventId], queryFn: () => getPublishedEventDetails(eventId), enabled: Boolean(eventId), staleTime: 30_000, retry: 1 });

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], video[controls]"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="published-event-details-title" onKeyDown={handleDialogKeyDown}>
    <div className="flex items-start justify-between gap-4 border-b border-[#e1ebe6] p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a8a80]">Published Event</p><h2 id="published-event-details-title" className="mt-1 text-2xl font-bold text-[#06201c]">{query.data?.title ?? "Event details"}</h2></div><button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close Event details" className="rounded-full border border-[#d7e5df] px-3 py-2 text-sm font-semibold text-[#31594d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">Close</button></div>
    <div className="overflow-y-auto p-5">{query.isLoading ? <div role="status" className="space-y-3"><div className="h-8 animate-pulse rounded bg-[#edf3f0]" /><div className="h-40 animate-pulse rounded-2xl bg-[#edf3f0]" /><p className="text-sm text-[#52736a]">Loading complete Event details…</p></div> : query.isError ? <div className="rounded-2xl border border-[#f2c7c2] bg-[#fff7f5] p-5"><p role="alert" className="font-semibold text-[#b42318]">{query.error instanceof Error ? query.error.message : "Unable to load Event details."}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">Retry</button></div> : query.data ? <EventDetailContent event={query.data} /> : <p className="text-sm text-[#52736a]">No Event details were returned.</p>}</div>
  </div></div>;
}
