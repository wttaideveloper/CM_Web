import type { Event, EventSessionInput } from "./events.service";

/**
 * Builds reusable Event configuration without copying response-only ownership, lifecycle, audit, or related-record data.
 *
 * Location and ticket IDs are retained because the current Event editor treats them as required configuration values,
 * while dedicated Session IDs are removed so the backend can regenerate them when it applies the template.
 */
export function buildEventTemplateData(event: Event): Record<string, unknown> {
  return {
    location_id: event.location_id,
    title: event.title,
    description: event.description,
    category: event.category,
    subcategory: event.subcategory,
    tags: event.tags,
    organiser_name: event.organiser_name,
    organiser_contact: event.organiser_contact,
    start_date: event.start_date,
    end_date: event.end_date,
    time_zone: event.time_zone,
    registration_cutoff: event.registration_cutoff,
    primary_image: event.primary_image,
    gallery_images: event.gallery_images,
    videos: event.videos,
    documents: event.documents,
    delivery_mode: event.delivery_mode,
    venue: event.venue,
    meeting_link: event.meeting_link ?? null,
    meeting_provider: event.meeting_provider,
    price: event.price,
    currency: event.currency,
    ticket_types: event.ticket_types,
    capacity: event.capacity,
    min_participants: event.min_participants,
    max_participants: event.max_participants,
    registration_open_at: event.registration_open_at,
    registration_close_at: event.registration_close_at,
    custom_fields: event.custom_fields,
    sessions: event.sessions.map(toTemplateSession),
  };
}

type EventTemplateSessionData = EventSessionInput & { meeting_link: string | null };

function toTemplateSession(session: Event["sessions"][number]): EventTemplateSessionData {
  return {
    session_date: session.session_date ?? "",
    title: session.title,
    speaker: session.speaker ?? "",
    start_time: session.start_time ?? "",
    end_time: session.end_time ?? "",
    location: session.location ?? "",
    meeting_link: session.meeting_link ?? null,
  };
}
