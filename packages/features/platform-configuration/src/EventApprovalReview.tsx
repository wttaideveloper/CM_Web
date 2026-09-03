"use client";

import { useRef, useState } from "react";
import EventApprovalDialog from "./EventApprovalDialog";
import type { EventApprovalDecision } from "./event-approval.service";
import type { EventApprovalReview, EventSession } from "./event-approval-review.types";
import { EnterpriseDisplayName, TenantDisplayName } from "./EventOwnershipNames";

type DisplayRow = { label: string; value: React.ReactNode };

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function enumLabel(value: string | null | undefined): string {
  return hasText(value) ? value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()) : "Not provided";
}

function wallClockDateTime(value: string | null | undefined): string {
  if (!hasText(value)) return "Not provided";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const dateLabel = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(date);
  if (!hour || !minute) return dateLabel;
  const time = new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute), Number(second ?? "0")));
  const timeLabel = new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: "UTC" }).format(time);
  return `${dateLabel}, ${timeLabel}`;
}

function wallClockTime(value: string | null | undefined): string | null {
  if (!hasText(value)) return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return value;
  const time = new Date(Date.UTC(2000, 0, 1, Number(match[1]), Number(match[2]), Number(match[3] ?? "0")));
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: "UTC" }).format(time);
}

function priceLabel(price: string | null | undefined, currency: string | null | undefined): string | null {
  if (!hasText(price)) return null;
  const number = Number(price);
  if (Number.isFinite(number) && hasText(currency)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(number);
    } catch {
      return `${price} ${currency}`;
    }
  }
  return hasText(currency) ? `${price} ${currency}` : price;
}

function mediaUrl(value: string): React.ReactNode {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return value;
    return <a href={url.toString()} target="_blank" rel="noreferrer" className="break-all font-semibold text-[#1f6a58] underline">{url.toString()}</a>;
  } catch {
    return value;
  }
}

function DetailGrid({ rows }: { rows: DisplayRow[] }) {
  if (rows.length === 0) return null;
  return <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{rows.map((row) => <div key={row.label}><dt className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">{row.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-[#284940]">{row.value}</dd></div>)}</dl>;
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-[#e1ebe6] pt-6 first:border-t-0 first:pt-0"><h3 className="text-lg font-bold text-[#06201c]">{title}</h3><div className="mt-4">{children}</div></section>;
}

function Agenda({ sessions }: { sessions: EventSession[] }) {
  const grouped = sessions.reduce<Record<string, EventSession[]>>((groups, session) => {
    const date = session.session_date ?? "Unscheduled";
    groups[date] = [...(groups[date] ?? []), session];
    return groups;
  }, {});
  return <div className="space-y-5">{Object.entries(grouped).sort(([first], [second]) => first.localeCompare(second)).map(([date, dateSessions]) => <div key={date}><h4 className="font-bold text-[#284940]">{date === "Unscheduled" ? date : wallClockDateTime(date)}</h4><div className="mt-2 space-y-3">{[...dateSessions].sort((first, second) => (first.start_time ?? "").localeCompare(second.start_time ?? "")).map((session, index) => <article key={session.id ?? `${date}-${session.title}-${index}`} className="rounded-xl bg-[#f4faf7] p-4"><p className="font-bold text-[#06201c]">{session.title}</p>{(wallClockTime(session.start_time) || wallClockTime(session.end_time)) ? <p className="mt-1">{wallClockTime(session.start_time) ?? "Time not provided"} — {wallClockTime(session.end_time) ?? "Time not provided"}</p> : null}<DetailGrid rows={[...(hasText(session.speaker) ? [{ label: "Speaker", value: session.speaker }] : []), ...(hasText(session.location) ? [{ label: "Location", value: session.location }] : []), ...(hasText(session.meeting_link) ? [{ label: "Meeting link", value: mediaUrl(session.meeting_link) }] : [])]} /></article>)}</div></div>)}</div>;
}

/** Renders the complete backend-backed Event dossier for Super Admin review without mutation controls. */
export default function EventApprovalReview({
  event,
  approvalPending,
  approvalError,
  onDecision,
}: {
  event: EventApprovalReview;
  approvalPending: boolean;
  approvalError: string | null;
  onDecision: (action: EventApprovalDecision, reason?: string) => void;
}) {
  const [decision, setDecision] = useState<EventApprovalDecision | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement>(null);
  const closeConfirmation = () => {
    setDecision(null);
    window.setTimeout(() => approveButtonRef.current?.focus(), 0);
  };
  const basePrice = priceLabel(event.price, event.currency);
  const hasMedia = [event.primary_image, ...(event.gallery_images ?? []), ...(event.videos ?? []), ...(event.documents ?? [])].some(hasText);

  return <div className="mt-5 space-y-6 text-sm text-[#52736a]">
    <ReviewSection title="Event Overview"><DetailGrid rows={[{ label: "Event title", value: event.title }, ...(hasText(event.description) ? [{ label: "Description", value: event.description }] : []), { label: "Category", value: event.category }, ...(hasText(event.subcategory) ? [{ label: "Subcategory", value: event.subcategory }] : []), { label: "Status", value: enumLabel(event.status) }, ...(hasText(event.organiser_name) ? [{ label: "Organizer", value: event.organiser_name }] : []), ...(hasText(event.organiser_contact) ? [{ label: "Organizer contact", value: event.organiser_contact }] : [])]} />{event.tags?.length ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Tags</p><div className="mt-2 flex flex-wrap gap-2">{event.tags.map((tag) => <span key={tag} className="rounded-full bg-[#edf3f0] px-3 py-1 font-semibold text-[#284940]">{tag}</span>)}</div></div> : null}</ReviewSection>
    <ReviewSection title="Enterprise / Ownership"><DetailGrid rows={[{ label: "Enterprise", value: <EnterpriseDisplayName enterpriseId={event.enterprise_id} eventEnterpriseName={event.enterprise_name} /> }, { label: "Tenant", value: <TenantDisplayName tenantId={event.tenant_id} /> }]} /></ReviewSection>
    <ReviewSection title="Schedule & Registration Window"><DetailGrid rows={[...(hasText(event.start_date) ? [{ label: "Starts", value: wallClockDateTime(event.start_date) }] : []), ...(hasText(event.end_date) ? [{ label: "Ends", value: wallClockDateTime(event.end_date) }] : []), ...(hasText(event.time_zone) ? [{ label: "Time zone", value: event.time_zone }] : []), ...(hasText(event.registration_open_at) ? [{ label: "Registration opens", value: wallClockDateTime(event.registration_open_at) }] : []), ...(hasText(event.registration_close_at) ? [{ label: "Registration closes", value: wallClockDateTime(event.registration_close_at) }] : []), ...(hasText(event.registration_cutoff) ? [{ label: "Registration cutoff", value: wallClockDateTime(event.registration_cutoff) }] : [])]} /></ReviewSection>
    {(hasText(event.delivery_mode) || event.venue || hasText(event.meeting_link) || hasText(event.meeting_provider)) ? <ReviewSection title="Location & Delivery"><DetailGrid rows={[...(hasText(event.delivery_mode) ? [{ label: "Delivery mode", value: enumLabel(event.delivery_mode) }] : []), ...(hasText(event.venue?.name) ? [{ label: "Venue", value: event.venue.name }] : []), ...(hasText(event.venue?.address) ? [{ label: "Address", value: event.venue.address }] : []), ...(hasText(event.venue?.city) ? [{ label: "City", value: event.venue.city }] : []), ...(hasText(event.meeting_provider) ? [{ label: "Meeting provider", value: event.meeting_provider }] : []), ...(hasText(event.meeting_link) ? [{ label: "Meeting link", value: mediaUrl(event.meeting_link) }] : [])]} /></ReviewSection> : null}
    {(basePrice || event.ticket_types?.length) ? <ReviewSection title="Pricing & Tickets"><DetailGrid rows={[...(basePrice ? [{ label: "Base price", value: basePrice }] : []), ...(basePrice ? [{ label: "Admission", value: Number(event.price) === 0 ? "Free" : "Paid" }] : [])]} />{event.ticket_types?.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{event.ticket_types.map((ticket, index) => <article key={ticket.id ?? `${ticket.name}-${index}`} className="rounded-xl bg-[#f4faf7] p-4"><p className="font-bold text-[#06201c]">{ticket.name}</p>{priceLabel(ticket.price, ticket.currency) ? <p className="mt-1">{priceLabel(ticket.price, ticket.currency)}</p> : null}{hasText(ticket.capacity) ? <p className="mt-1">{ticket.capacity} seats</p> : null}</article>)}</div> : null}</ReviewSection> : null}
    {(hasText(event.capacity) || hasText(event.min_participants) || hasText(event.max_participants)) ? <ReviewSection title="Capacity & Participation"><DetailGrid rows={[...(hasText(event.capacity) ? [{ label: "Event capacity", value: event.capacity }] : []), ...(hasText(event.min_participants) ? [{ label: "Minimum participants", value: event.min_participants }] : []), ...(hasText(event.max_participants) ? [{ label: "Maximum participants", value: event.max_participants }] : [])]} /></ReviewSection> : null}
    {event.sessions?.length ? <ReviewSection title="Sessions / Agenda"><Agenda sessions={event.sessions} /></ReviewSection> : null}
    {hasMedia ? <ReviewSection title="Media"><div className="space-y-4">{hasText(event.primary_image) ? <div><p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Primary image</p><img src={event.primary_image} alt={`${event.title} primary`} className="mt-2 max-h-72 max-w-full rounded-xl border border-[#e1ebe6] object-contain" /></div> : null}{event.gallery_images?.filter(hasText).length ? <div><p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Gallery</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{event.gallery_images.filter(hasText).map((image) => <img key={image} src={image} alt={`${event.title} gallery image`} className="max-h-60 w-full rounded-xl border border-[#e1ebe6] object-contain" />)}</div></div> : null}{event.videos?.filter(hasText).length ? <div><p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Videos</p><ul className="mt-2 space-y-2">{event.videos.filter(hasText).map((video) => <li key={video}>{mediaUrl(video)}</li>)}</ul></div> : null}{event.documents?.filter(hasText).length ? <div><p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Documents</p><ul className="mt-2 space-y-2">{event.documents.filter(hasText).map((document) => <li key={document}>{mediaUrl(document)}</li>)}</ul></div> : null}</div></ReviewSection> : null}
    {event.custom_fields?.length ? <ReviewSection title="Registration Configuration"><div className="space-y-3">{event.custom_fields.map((field, index) => <article key={`${field.label}-${index}`} className="rounded-xl bg-[#f4faf7] p-4"><p className="font-bold text-[#06201c]">{field.label}</p><p className="mt-1">Type: {enumLabel(field.type)}</p>{field.options.length ? <p className="mt-1">Options: {field.options.join(", ")}</p> : null}</article>)}</div></ReviewSection> : null}
    <ReviewSection title="Record Information"><DetailGrid rows={[{ label: "Current status", value: enumLabel(event.status) }, ...(hasText(event.created_at) ? [{ label: "Created", value: wallClockDateTime(event.created_at) }] : []), ...(hasText(event.updated_at) ? [{ label: "Last updated", value: wallClockDateTime(event.updated_at) }] : [])]} /></ReviewSection>
    {event.status === "pending_approval" ? <section className="rounded-2xl border border-[#cde5db] bg-[#f4faf7] p-5"><h3 className="text-lg font-bold text-[#06201c]">Review this Event</h3><p className="mt-2">Approve it, request a revision, or reject it using the backend approval workflow.</p><div className="mt-4 flex flex-wrap gap-3"><button ref={approveButtonRef} type="button" onClick={() => setDecision("approve")} disabled={approvalPending} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">Approve Event</button><button type="button" onClick={() => setDecision("request_changes")} disabled={approvalPending} className="h-11 rounded-full border border-[#b7791f] px-5 text-sm font-bold text-[#8a5a00] disabled:cursor-not-allowed disabled:opacity-60">Request Changes</button><button type="button" onClick={() => setDecision("reject")} disabled={approvalPending} className="h-11 rounded-full border border-[#b42318] px-5 text-sm font-bold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">Reject Event</button></div></section> : null}
    <EventApprovalDialog action={decision} eventTitle={event.title} pending={approvalPending} error={approvalError} onCancel={closeConfirmation} onConfirm={(reason) => { if (decision) onDecision(decision, reason); }} />
  </div>;
}
