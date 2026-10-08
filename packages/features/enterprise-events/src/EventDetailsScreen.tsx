"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import EventActionsMenu from "./EventActionsMenu";
import ConfiguredEventDetails from "./ConfiguredEventDetails";
import EventAttendanceSection from "./EventAttendanceSection";
import {
  EventCalendarDownloadAction,
  SessionCalendarDownloadAction,
} from "./EventCalendarDownloadActions";
import EventCommunicationsActions from "./EventCommunicationsActions";
import EventRefundAction from "./EventRefundAction";
import EventMediaPreview from "./EventMediaPreview";
import { mediaItemUrl, type EventMediaItem } from "./event-media";
import EventOrdersSection from "./EventOrdersSection";
import EventOverviewSection from "./EventOverviewSection";
import EventReportsSection from "./EventReportsSection";
import SessionAttendancePanel from "./SessionAttendancePanel";
import {
  displayValue,
  formatEventDate,
  formatEventDateTime,
  formatEventDeliveryMode,
  formatEventDurationType,
  formatEventTime,
} from "./event-detail-formatters";
import {
  canEditEvent,
  getEventStatusBadgeClass,
  getEventStatusLabel,
  hasOperationalEventDataAccess,
} from "./event-status";
import {
  formatSessionDate,
  getEventSessionDates,
  getSessionTimeBounds,
} from "./event-session-date";
import {
  addEventSession,
  deleteEventSession,
  EventsApiError,
  exportEventRegistrations,
  getEventAdminNotes,
  getEventAttendees,
  createEventWalkIn,
  getEventRegistrationForm,
  getEventById,
  getEventAttendance,
  getEventFeedback,
  getEventFulfilment,
  getEventRegistrations,
  getEventSessions,
  getEventWaitlist,
  resubmitEvent,
  updateEventSession,
  type AddEventSessionPayload,
  type ActiveEventFormConfiguration,
  type ActiveEventFormField,
  type Event,
  type EventAttendeeAnswer,
  type EventAttendeeAnswers,
  type EventAttendeeServiceSelection,
  type AccommodationOption,
  type MealOption,
  quoteEventCheckout,
  type EventRegistration,
  type EventSession,
  type UpdateEventSessionPayload,
} from "./events.service";
import { useEventHistoricalFormConfiguration } from "./event-form-configuration.queries";
import SessionTableEditor, { type SessionDraft } from "./SessionTableEditor";

type DetailItem = {
  label: string;
  value: string | number | boolean | null | undefined;
};
type EventDetailsTab = "overview" | "details" | "sessions" | "registrations" | "attendance" | "feedback" | "reports" | "orders" | "fulfilment";
type RegistrationsSubview = "registered" | "waitlist";

function AdminNoteBanner({ eventId, status }: { eventId: string; status: string }) {
  const adminNoteQuery = useQuery({
    queryKey: ["events", eventId, "admin-notes"],
    queryFn: () => getEventAdminNotes(eventId),
    enabled: Boolean(eventId) && (status === "rejected" || status === "needs_revision"),
    staleTime: 30_000,
    retry: 1,
  });

  const data = adminNoteQuery.data;
  let note: string | null = null;
  let by: string | null = null;
  if (typeof data === "string") {
    note = data.trim() || null;
  } else if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    note = [record.last_admin_notes, record.note, record.message, record.reason, record.comment, record.notes, record.admin_note]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
    by = [record.performed_by, record.admin_name]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
  }

  if (!note && status !== "needs_revision") return null;
  return (
    <section role="status" className="mt-3 max-w-2xl rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3">
      <p className="text-sm font-bold text-[#735c1e]">{status === "needs_revision" ? "Needs Revision" : "Not approved"}{by ? ` by ${by}` : ""}</p>
      {adminNoteQuery.isLoading ? <p className="mt-1 text-sm text-[#735c1e]">Loading review feedback...</p> : null}
      {adminNoteQuery.isError ? (
        <div className="mt-1">
          <p role="alert" className="text-sm text-[#b42318]">Unable to load review feedback.</p>
          <button type="button" onClick={() => void adminNoteQuery.refetch()} className="mt-1 text-sm font-semibold text-[#1f6a58] underline">Retry</button>
        </div>
      ) : null}
      {note ? <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#735c1e]">{note}</p> : null}
    </section>
  );
}

const eventDetailsTabs: ReadonlyArray<{ id: EventDetailsTab; label: string }> =
  [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Details" },
    { id: "sessions", label: "Sessions" },
    { id: "registrations", label: "Registrations" },
    { id: "attendance", label: "Attendance" },
    { id: "feedback", label: "Feedback" },
    { id: "reports", label: "Reports" },
    { id: "orders", label: "Orders" },
    { id: "fulfilment", label: "Fulfilment" },
  ];

const registrationsSubviews: ReadonlyArray<{
  id: RegistrationsSubview;
  label: string;
}> = [
  { id: "registered", label: "Registered" },
  { id: "waitlist", label: "Waitlist" },
];

function isHistoricalSessionsField(field: ActiveEventFormField): boolean {
  const key = field.core_key ?? field.stable_key ?? field.id;
  return field.source === "core" && key === "sessions" && field.renderer === "sessions" && field.is_enabled !== false;
}

type SessionSubfield = "session_date" | "title" | "description" | "speaker" | "speaker_bio" | "start_time" | "end_time" | "location" | "meeting_link";

function isSessionSubfieldEnabled(field: ActiveEventFormField | null | undefined, name: SessionSubfield): boolean {
  const enabledFields = field?.composite_config?.enabled_fields;
  return enabledFields === undefined || enabledFields.includes(name);
}

function isSessionSubfieldRequired(field: ActiveEventFormField | null | undefined, name: SessionSubfield): boolean {
  if (!field) return name === "session_date" || name === "title";
  return field.composite_config?.required_fields?.includes(name) ?? false;
}

function isDeliveryFieldApplicable(field: SessionSubfield, deliveryMode: string): boolean {
  if (field === "location") return deliveryMode !== "online";
  if (field === "meeting_link") return deliveryMode === "online" || deliveryMode === "hybrid";
  return true;
}

/** Renders every supported field from a single authenticated Event response. */
export default function EventDetailsScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventDetailsTab>("overview");
  const eventQuery = useQuery({
    queryKey: ["events", "detail", eventId],
    queryFn: () => getEventById(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });
  const historicalConfiguration = useEventHistoricalFormConfiguration(
    eventQuery.data?.id,
    Boolean(eventQuery.data?.form_configuration_id && eventQuery.data?.form_configuration_version_id),
  );
  const attendanceHistoryQuery = useQuery({
    queryKey: ["event-attendance", eventId],
    queryFn: () => getEventAttendance(eventId),
    enabled: Boolean(eventQuery.data?.id) && eventQuery.data?.modules?.check_in === false,
    staleTime: 30_000,
    retry: 1,
  });
  const historicalSessionsField = useMemo(() => historicalConfiguration.data?.sections
    .filter((section) => section.is_enabled)
    .flatMap((section) => section.fields)
    .find((field) => isHistoricalSessionsField(field)) ?? null, [historicalConfiguration.data]);
  const resubmitMutation = useMutation({
    mutationFn: () => resubmitEvent(eventId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["events", "list"] }),
      ]);
      setStatusFeedback("Event resubmitted for approval.");
    },
    onError: () => setStatusFeedback("Unable to resubmit this Event for approval. Please try again."),
  });
  useEffect(() => {
    const status = eventQuery.data?.status;
    if (status && !hasOperationalEventDataAccess(status) && activeTab !== "overview" && activeTab !== "details") {
      setActiveTab("overview");
    }
  }, [activeTab, eventQuery.data?.status]);

  if (eventQuery.isLoading) return <EventDetailsSkeleton />;
  if (eventQuery.isError)
    return (
      <EventDetailsError
        error={eventQuery.error}
        retry={() => void eventQuery.refetch()}
      />
    );
  if (!eventQuery.data) return <EventDetailsSkeleton />;

  const event = eventQuery.data;
  const hasOperationalDataAccess = hasOperationalEventDataAccess(event.status);
  const sessionsOperational = event.modules?.sessions !== false;
  const sessionsVisible = sessionsOperational || event.sessions.length > 0;
  const hasHistoricalAttendance = attendanceHistoryQuery.data?.participants.length ? attendanceHistoryQuery.data.participants.length > 0 : false;
  const visibleTabs = hasOperationalDataAccess
    ? eventDetailsTabs.filter((tab) => (tab.id !== "attendance" || event.modules?.check_in !== false || hasHistoricalAttendance) && (tab.id !== "sessions" || sessionsVisible))
    : eventDetailsTabs.slice(0, 2);
  const effectiveActiveTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";
  const coordinates = event.venue?.coordinates;
  return (
    <div className="w-full">
      <header className="border-b border-[#edf3f0] pb-6">
        <Link
          href="/admin/events"
          className="text-sm font-semibold text-[#1f6a58]"
        >
          ← Back to Events
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7f9d94]">
              {displayValue(event.category)} / {displayValue(event.subcategory)}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">
              {displayValue(event.title)}
            </h1>
            <p className="mt-2 text-sm text-[#52736a]">
              {formatEventDateTime(event.start_date, event.time_zone)} ·{" "}
              {displayValue(event.delivery_mode)} ·{" "}
              {displayValue(event.enterprise_name ?? "Tenant-owned")}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${getEventStatusBadgeClass(event.status)}`}
          >
            {getEventStatusLabel(event.status)}
          </span>
          {event.lifecycle_state ? <span className="rounded-full bg-[#f1f7f4] px-3 py-1 text-xs font-bold capitalize text-[#52736a]">{event.lifecycle_state}</span> : null}
        </div>
      </header>
      {(event.status === "needs_revision" || event.status === "rejected") ? <AdminNoteBanner eventId={event.id} status={event.status} /> : null}
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          {statusFeedback ? (
            <p
              role="status"
              className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]"
            >
              {statusFeedback}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {canEditEvent(event.status) ? (
            <Link
              href={`/admin/events/${event.id}/edit`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              Edit Event
            </Link>
          ) : null}
          {event.status === "needs_revision" ? (
            <button type="button" onClick={() => resubmitMutation.mutate()} disabled={resubmitMutation.isPending} className="inline-flex h-11 items-center justify-center rounded-full border border-[#1f6a58] px-5 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">
              {resubmitMutation.isPending ? "Resubmitting..." : "Resubmit for approval"}
            </button>
          ) : null}
          <EventActionsMenu
            event={event}
            includeNavigation={false}
            onStatusSuccess={() => setStatusFeedback("Event status updated.")}
            onDuplicateSuccess={() => setStatusFeedback("Event duplicated.")}
            onDeleteSuccess={() => router.replace("/admin/events")}
          />
          <EventCommunicationsActions
            event={event}
            onSuccess={setStatusFeedback}
          />
          <EventCalendarDownloadAction eventId={event.id} />
        </div>
      </div>
      <EventDetailsTabs tabs={visibleTabs} activeTab={effectiveActiveTab} onChange={setActiveTab} />
      {effectiveActiveTab === "overview" ? (
        <section id="event-overview-panel" role="tabpanel" aria-labelledby="event-overview-tab" className="mt-6">
          <EventOverviewSection
            event={event}
            timeZone={event.time_zone}
            operationalDataEnabled={hasOperationalDataAccess}
            onViewDetails={() => setActiveTab("details")}
            onViewRegistrations={() => setActiveTab("registrations")}
          />
        </section>
      ) : null}
      <div
        id="event-details-panel"
        role="tabpanel"
        aria-labelledby="event-details-tab"
        hidden={effectiveActiveTab !== "details"}
        className="mt-6 space-y-5"
      >
        {historicalConfiguration.data ? <ConfiguredEventDetails
          configuration={historicalConfiguration.data}
          event={event}
          sessionsSection={historicalSessionsField ? <SessionsSection
            eventId={event.id}
            deliveryMode={event.delivery_mode}
            startDate={event.start_date}
            endDate={event.end_date}
            enabled={effectiveActiveTab === "details"}
            sessionField={historicalSessionsField}
          /> : undefined}
        /> : <>
        <DetailSection title="Overview / Basic Information">
          <DetailGrid
            items={[
              { label: "Event Name", value: event.title },
              { label: "Description", value: event.description },
              { label: "Category", value: event.category },
              { label: "Subcategory", value: event.subcategory },
              { label: "Status", value: event.status },
              { label: "Enterprise Name", value: event.enterprise_name ?? "Tenant-owned" },
              { label: "Organizer / Business", value: event.organiser_name },
              { label: "Organizer Contact", value: event.organiser_contact },
            ]}
          />
          <Tags values={event.tags} />
        </DetailSection>
        <DetailSection title="Schedule">
          <DetailGrid
            items={[
              {
                label: "Start Date",
                value: formatEventDate(event.start_date, event.time_zone),
              },
              {
                label: "Start Time",
                value: formatEventTime(event.start_date, event.time_zone),
              },
              {
                label: "End Date",
                value: formatEventDate(event.end_date, event.time_zone),
              },
              {
                label: "End Time",
                value: formatEventTime(event.end_date, event.time_zone),
              },
              { label: "Time Zone", value: event.time_zone },
              { label: "Duration Type", value: formatEventDurationType(event.duration_type) },
              {
                label: "Registration Cutoff",
                value: formatEventDateTime(
                  event.registration_cutoff,
                  event.time_zone,
                ),
              },
              {
                label: "Registration Opens",
                value: formatEventDateTime(
                  event.registration_open_at,
                  event.time_zone,
                ),
              },
              {
                label: "Registration Closes",
                value: formatEventDateTime(
                  event.registration_close_at,
                  event.time_zone,
                ),
              },
            ]}
          />
        </DetailSection>
        <DetailSection title="Location & Delivery">
          <DetailGrid
            items={[
              { label: "Delivery Mode", value: formatEventDeliveryMode(event.delivery_mode) },
              { label: "Location ID", value: event.location_id },
              { label: "Venue Name", value: event.venue?.name },
              { label: "Venue Address", value: event.venue?.address },
              { label: "City", value: event.venue?.city },
              { label: "Latitude", value: coordinates?.lat },
              { label: "Longitude", value: coordinates?.lng },
              { label: "Meeting Provider", value: event.meeting_provider },
            ]}
          />
          <ExternalValue label="Meeting Link" value={event.meeting_link} />
        </DetailSection>
        <DetailSection title="Pricing">
          <DetailGrid
            items={[
              { label: "Price", value: event.price },
              { label: "Pricing Type", value: event.pricing_type ?? (Number(event.price) === 0 ? "Free" : "Paid") },
              { label: "Currency", value: event.currency },
            ]}
          />
        </DetailSection>
        <DetailSection title="Ticket Types">
          <TicketTypes event={event} />
        </DetailSection>
        <DetailSection title="Capacity & Registration">
          <DetailGrid
            items={[
              { label: "Overall Capacity", value: event.capacity },
              { label: "Availability", value: formatSeatAvailability(event) },
              { label: "Minimum Participants", value: event.min_participants },
              { label: "Maximum Participants", value: event.max_participants },
            ]}
          />
        </DetailSection>
        <DetailSection title="Media">
          <MediaImage label="Primary Image" value={event.primary_image ?? ""} />
          <MediaList
            label="Gallery Images"
            empty="No gallery images"
            values={event.gallery_images}
            kind="image"
          />
          <MediaList label="Videos" empty="No videos" values={event.videos} kind="video" />
          <MediaList
            label="Documents"
            empty="No documents"
            values={event.documents}
            kind="document"
          />
        </DetailSection>
        <DetailSection title="Custom Registration Fields">
          <CustomFields event={event} />
        </DetailSection>
        <DetailSection title="Record Information" secondary>
          <DetailGrid
            items={[
              { label: "Event ID", value: event.id },
              { label: "Tenant ID", value: event.tenant_id },
              { label: "Enterprise ID", value: event.enterprise_id ?? "Tenant-owned" },
              { label: "Location ID", value: event.location_id },
              {
                label: "Created At",
                value: formatEventDateTime(event.created_at, event.time_zone),
              },
              {
                label: "Updated At",
                value: formatEventDateTime(event.updated_at, event.time_zone),
              },
              {
                label: "Record State",
                value: event.is_deleted ? "Deleted" : "Active",
              },
            ]}
          />
        </DetailSection>
        </>}
        <EventServicesDetails event={event} />
      </div>
      {effectiveActiveTab === "registrations" ? (
        <section
          id="event-registrations-panel"
          role="tabpanel"
          aria-labelledby="event-registrations-tab"
          className="mt-6"
        >
          <RegistrationsSection eventId={event.id} timeZone={event.time_zone} ticketTypes={event.ticket_types} pricingType={event.pricing_type} basePrice={event.price} sessions={event.sessions} modules={event.modules} meals={event.meals} accommodation={event.accommodation} historicalConfiguration={historicalConfiguration.data ?? undefined} />
        </section>
      ) : null}
      {effectiveActiveTab === "sessions" ? <section id="event-sessions-panel" role="tabpanel" aria-labelledby="event-sessions-tab" className="mt-6"><SessionsSection eventId={event.id} deliveryMode={event.delivery_mode} startDate={event.start_date} endDate={event.end_date} enabled={sessionsOperational} /><SessionAttendancePanel eventId={event.id} sessions={event.sessions} enabled={sessionsOperational} /></section> : null}
      {effectiveActiveTab === "attendance" ? (
        <section id="event-attendance-panel" role="tabpanel" aria-labelledby="event-attendance-tab" className="mt-6">
          <EventAttendanceSection eventId={event.id} eventStatus={event.status} timeZone={event.time_zone} checkInEnabled={event.modules?.check_in !== false} />
        </section>
      ) : null}
      {effectiveActiveTab === "feedback" ? (
        <section id="event-feedback-panel" role="tabpanel" aria-labelledby="event-feedback-tab" className="mt-6">
          <FeedbackSection eventId={event.id} />
        </section>
      ) : null}
      {effectiveActiveTab === "reports" ? (
        <section id="event-reports-panel" role="tabpanel" aria-labelledby="event-reports-tab" className="mt-6">
          <EventReportsSection eventId={event.id} ticketTypes={event.ticket_types} />
        </section>
      ) : null}
      {effectiveActiveTab === "orders" ? (
        <section id="event-orders-panel" role="tabpanel" aria-labelledby="event-orders-tab" className="mt-6">
          <EventOrdersSection eventId={event.id} timeZone={event.time_zone} />
        </section>
      ) : null}
      {effectiveActiveTab === "fulfilment" ? <EventFulfilmentSection eventId={event.id} /> : null}
    </div>
  );
}

function formatSeatAvailability(event: Event): string {
  if (event.is_full === true) return "Full";
  if (typeof event.available_seats === "number") {
    return `${event.available_seats} ${event.available_seats === 1 ? "seat" : "seats"} left`;
  }
  return "—";
}

function FeedbackSection({ eventId }: { eventId: string }) {
  const feedbackQuery = useQuery({
    queryKey: ["event-feedback", eventId],
    queryFn: () => getEventFeedback(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });

  if (feedbackQuery.isLoading) return <section role="status" aria-label="Loading event feedback" className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-[#edf3f0]" /><div className="h-28 animate-pulse rounded-2xl bg-[#f1f4f3]" /></section>;
  if (feedbackQuery.isError) return <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 text-center shadow-sm"><p className="font-bold text-[#06201c]">Unable to load event feedback.</p><button type="button" onClick={() => void feedbackQuery.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></section>;
  if (isEmptyFeedback(feedbackQuery.data)) return <section className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-5 py-12 text-center"><p className="font-bold text-[#06201c]">No feedback submitted yet.</p><p className="mt-2 text-sm text-[#52736a]">Submitted feedback will appear here for read-only review.</p></section>;

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-[#06201c]">Submitted feedback</h2><p className="mt-1 text-sm text-[#52736a]">Feedback is read-only for Enterprise Admin.</p><pre className="mt-4 max-h-[32rem] overflow-auto rounded-xl bg-[#f8fbf9] p-4 text-left text-xs leading-5 text-[#31594d]">{formatFeedbackResponse(feedbackQuery.data)}</pre></section>;
}

function isEmptyFeedback(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function formatFeedbackResponse(value: unknown): string {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2) ?? "Feedback response received."; } catch { return "Feedback response received."; }
}

function EventDetailsTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: ReadonlyArray<{ id: EventDetailsTab; label: string }>;
  activeTab: EventDetailsTab;
  onChange: (tab: EventDetailsTab) => void;
}) {
  return (
    <div
      className="mt-6 border-b border-[#e1ebe6]"
      role="tablist"
      aria-label="Event details sections"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`event-${tab.id}-tab`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`event-${tab.id}-panel`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => handleTabKeyDown(event, index, onChange)}
          className={`mr-6 border-b-2 px-1 pb-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2 ${activeTab === tab.id ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a] hover:text-[#06201c]"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function handleTabKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  onChange: (tab: EventDetailsTab) => void,
) {
  const lastIndex = eventDetailsTabs.length - 1;
  const nextIndex =
    event.key === "ArrowRight"
      ? (currentIndex + 1) % eventDetailsTabs.length
      : event.key === "ArrowLeft"
        ? (currentIndex - 1 + eventDetailsTabs.length) % eventDetailsTabs.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? lastIndex
            : null;
  if (nextIndex === null) return;
  onChange(eventDetailsTabs[nextIndex].id);
  window.requestAnimationFrame(() =>
    document
      .getElementById(`event-${eventDetailsTabs[nextIndex].id}-tab`)
      ?.focus(),
  );
  event.preventDefault();
}

function RegistrationsSection({ eventId, timeZone, ticketTypes, pricingType, basePrice, sessions, modules, meals, accommodation, historicalConfiguration }: { eventId: string; timeZone: string; ticketTypes: Event["ticket_types"]; pricingType?: Event["pricing_type"]; basePrice: string | null; sessions: Event["sessions"]; modules: Event["modules"]; meals: Event["meals"]; accommodation: Event["accommodation"]; historicalConfiguration?: ActiveEventFormConfiguration }) {
  const [activeSubview, setActiveSubview] =
    useState<RegistrationsSubview>("registered");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [debouncedRegistrationSearch, setDebouncedRegistrationSearch] = useState("");
  const [attendeePage, setAttendeePage] = useState(1);
  const [attendeePageSize, setAttendeePageSize] = useState(25);
  const [attendeeSort, setAttendeeSort] = useState<"newest" | "oldest" | "name" | "email">("newest");
  const [attendeeStatus, setAttendeeStatus] = useState("");
  const [attendeeSource, setAttendeeSource] = useState<"" | "online" | "walk_in">("");
  const [attendeeCheckedIn, setAttendeeCheckedIn] = useState<"" | "true" | "false">("");
  const [attendeePaymentStatus, setAttendeePaymentStatus] = useState("");
  const [attendeeTicketTypeId, setAttendeeTicketTypeId] = useState("");
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState<EventRegistration | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedRegistrationSearch(registrationSearch.trim()), 300); return () => window.clearTimeout(timer); }, [registrationSearch]);
  const registrationsQuery = useQuery({
    queryKey: ["event-registrations", eventId, attendeePage, attendeePageSize, debouncedRegistrationSearch, attendeeSort, attendeeStatus, attendeeSource, attendeeCheckedIn, attendeePaymentStatus, attendeeTicketTypeId, registeredFrom, registeredTo],
    queryFn: async () => {
      const response = await getEventAttendees(eventId, { page: attendeePage, page_size: attendeePageSize, q: debouncedRegistrationSearch || undefined, sort: attendeeSort, status: attendeeStatus || undefined, source: attendeeSource || undefined, checked_in: attendeeCheckedIn === "" ? undefined : attendeeCheckedIn === "true", payment_status: attendeePaymentStatus || undefined, ticket_type_id: attendeeTicketTypeId || undefined, registered_from: registeredFrom || undefined, registered_to: registeredTo || undefined });
      return { items: response.items.map((attendee): EventRegistration => ({
        event_id: attendee.event_id, id: attendee.registration_id, participant_email: attendee.participant_email,
        ticket_type_id: attendee.ticket_type_id, ticket_type_name: attendee.ticket_type_name, status: attendee.registration_status,
        checked_in_at: attendee.checked_in_at, checked_out_at: attendee.checked_out_at,
        created_at: attendee.registered_at, participant_name: attendee.participant_name,
        custom_fields: attendee.custom_answers, qr_code: "", checked_in_by: null, session_id: null,
        registration_source: attendee.registration_source, registration_reference: attendee.registration_reference,
        payment_status: attendee.payment_status, order_id: attendee.order_id, order_status: attendee.order_status,
        amount: attendee.amount, currency: attendee.currency, meal_selections: attendee.meal_selections,
        accommodation_selections: attendee.accommodation_selections, session_attendance: attendee.session_attendance,
      })), pagination: response.pagination };
    },
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
  const waitlistQuery = useQuery({
    queryKey: ["event-waitlist", eventId],
    queryFn: () => getEventWaitlist(eventId),
    enabled: activeSubview === "waitlist" && Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });
  const filteredRegistrations = useMemo(() => {
    return registrationsQuery.data?.items ?? [];
  }, [registrationsQuery.data]);

  const exportRegistrations = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportError(null);
    try {
      const exportResponse = await exportEventRegistrations(eventId);
      const objectUrl = URL.createObjectURL(exportResponse.blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download =
        sanitizeDownloadFilename(exportResponse.filename) ??
        "event-registrations.csv";
      downloadLink.style.display = "none";
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      setExportError("Couldn't export registrations. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const registrationHeader = (
    <><RegistrationsHeader activeSubview={activeSubview} isExporting={isExporting} onExport={() => void exportRegistrations()} />{activeSubview === "registered" ? <div className="mt-3 grid gap-2 sm:grid-cols-4"><select aria-label="Registration status" value={attendeeStatus} onChange={(event) => { setAttendeeStatus(event.target.value); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] px-3 text-sm"><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select><select aria-label="Registration source" value={attendeeSource} onChange={(event) => { setAttendeeSource(event.target.value as typeof attendeeSource); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] px-3 text-sm"><option value="">All sources</option><option value="online">Online</option><option value="walk_in">Walk-in</option></select><select aria-label="Checked-in status" value={attendeeCheckedIn} onChange={(event) => { setAttendeeCheckedIn(event.target.value as typeof attendeeCheckedIn); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] px-3 text-sm"><option value="">All check-in states</option><option value="true">Checked in</option><option value="false">Not checked in</option></select><select aria-label="Attendee sort" value={attendeeSort} onChange={(event) => { setAttendeeSort(event.target.value as typeof attendeeSort); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] px-3 text-sm"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option><option value="email">Email</option></select><select aria-label="Payment status" value={attendeePaymentStatus} onChange={(event) => { setAttendeePaymentStatus(event.target.value); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] px-3 text-sm"><option value="">All payment states</option><option value="free">Free</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="refund_requested">Refund requested</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option><option value="failed">Failed</option></select>{ticketTypes.length > 0 ? <select aria-label="Ticket type" value={attendeeTicketTypeId} onChange={(event) => { setAttendeeTicketTypeId(event.target.value); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] px-3 text-sm"><option value="">All ticket types</option>{ticketTypes.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.name}</option>)}</select> : null}</div> : null}{activeSubview === "registered" && modules?.registration !== false ? <WalkInRegistration eventId={eventId} ticketTypes={ticketTypes} sessions={sessions} sessionsEnabled={modules?.sessions === true} onSuccess={() => void registrationsQuery.refetch()} /> : null}</>
  );
  const subviewNavigation = (
    <RegistrationsSubviewTabs
      activeSubview={activeSubview}
      onChange={setActiveSubview}
    />
  );

  if (activeSubview === "waitlist") {
    return (
      <RegistrationsPanel
        header={registrationHeader}
        navigation={subviewNavigation}
        subview={activeSubview}
      >
        {waitlistQuery.isLoading || !waitlistQuery.data ? (
          <div
            role="status"
            aria-live="polite"
            aria-label="Loading waitlist"
            className="space-y-3"
          >
            <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
            <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
          </div>
        ) : waitlistQuery.isError ? (
          <>
            <p role="alert" className="text-sm font-semibold text-[#b42318]">
              Couldn&apos;t load waitlist.
            </p>
            <button
              type="button"
              onClick={() => void waitlistQuery.refetch()}
              className="mt-3 text-sm font-semibold text-[#1f6a58] underline"
            >
              Retry
            </button>
          </>
        ) : waitlistQuery.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-8 text-center">
            <p className="text-sm font-bold text-[#06201c]">
              No one is on the waitlist
            </p>
            <p className="mt-1 text-sm text-[#52736a]">
              Participants waiting for a place in this event will appear here.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-[#06201c]">
              {waitlistQuery.data.length} waitlist record
              {waitlistQuery.data.length === 1 ? "" : "s"}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="border-y border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[.08em] text-[#52736a]">
                  <tr>
                    <th className="px-3 py-2">Participant</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Joined waitlist</th>
                    <th className="px-3 py-2">Registration</th>
                    <th className="px-3 py-2">Payment offer</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlistQuery.data.map((record) => (
                    <tr key={record.id} className="border-b border-[#edf3f0] last:border-b-0">
                      <td className="px-3 py-3 font-semibold text-[#06201c]">{record.participant_name || "Unknown participant"}</td>
                      <td className="px-3 py-3 text-[#52736a]">{record.participant_email || "—"}</td>
                      <td className="px-3 py-3"><span className="inline-flex rounded-full bg-[#edf3f0] px-2.5 py-1 text-xs font-semibold text-[#31594d]">{humanizeRegistrationStatus(record.status)}</span></td>
                      <td className="px-3 py-3 text-[#52736a]">{formatEventDateTime(record.created_at, timeZone)}</td>
                      <td className="px-3 py-3 text-[#52736a]">{record.registration_id ? "Registered / Promoted" : "Not registered"}</td>
                      <td className="px-3 py-3 text-[#52736a]">{record.payment_offer_expires_at ? formatEventDateTime(record.payment_offer_expires_at, timeZone) : "Not offered"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </RegistrationsPanel>
    );
  }

  if (registrationsQuery.isLoading || !registrationsQuery.data) {
    return (
      <RegistrationsPanel
        header={registrationHeader}
        navigation={subviewNavigation}
        subview={activeSubview}
        error={exportError}
      >
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading registrations"
          className="space-y-3"
        >
          <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
          <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
        </div>
      </RegistrationsPanel>
    );
  }

  if (registrationsQuery.isError) {
    return (
      <RegistrationsPanel
        header={registrationHeader}
        navigation={subviewNavigation}
        subview={activeSubview}
        error={exportError}
      >
        <p role="alert" className="text-sm font-semibold text-[#b42318]">
          Unable to load registrations.
        </p>
        <button
          type="button"
          onClick={() => void registrationsQuery.refetch()}
          className="mt-3 text-sm font-semibold text-[#1f6a58] underline"
        >
          Retry
        </button>
      </RegistrationsPanel>
    );
  }

  if (registrationsQuery.data.items.length === 0) {
    return (
      <RegistrationsPanel
        header={registrationHeader}
        navigation={subviewNavigation}
        subview={activeSubview}
        error={exportError}
      >
        <div className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-8 text-center">
          <p className="text-sm font-bold text-[#06201c]">
            No registrations yet
          </p>
          <p className="mt-1 text-sm text-[#52736a]">
            Registrations for this event will appear here.
          </p>
        </div>
      </RegistrationsPanel>
    );
  }

  return (
    <RegistrationsPanel
      header={registrationHeader}
      navigation={subviewNavigation}
      subview={activeSubview}
      error={exportError}
    >
        {registrationsQuery.isFetching ? <p role="status" className="mb-2 text-xs font-semibold text-[#7f9d94]">Refreshing attendees…</p> : null}
        <RegistrationTable
          eventId={eventId}
        registrations={filteredRegistrations}
        totalRegistrations={registrationsQuery.data.items.filter(isActiveRegistration).length}
        search={registrationSearch}
          onSearchChange={(value) => { setRegistrationSearch(value); setAttendeePage(1); }}
          onSelect={setSelectedRegistration}
          sessions={sessions}
          ticketTypes={ticketTypes}
          pricingType={pricingType}
          basePrice={basePrice}
        />
        <div className="mt-4 flex items-center justify-between gap-3 text-sm"><label>Rows<select value={attendeePageSize} onChange={(event) => { setAttendeePageSize(Number(event.target.value)); setAttendeePage(1); }} className="ml-2 rounded-lg border border-[#d7e5df] px-2 py-1"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><span>Page {registrationsQuery.data.pagination.page} of {registrationsQuery.data.pagination.total_pages} · {registrationsQuery.data.pagination.total} attendees</span><div className="flex gap-2"><button type="button" disabled={attendeePage <= 1 || registrationsQuery.isFetching} onClick={() => setAttendeePage((page) => page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1 disabled:opacity-50">Previous</button><button type="button" disabled={attendeePage >= registrationsQuery.data.pagination.total_pages || registrationsQuery.isFetching} onClick={() => setAttendeePage((page) => page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1 disabled:opacity-50">Next</button></div></div>
         {selectedRegistration ? <RegistrationDetailsDrawer registration={selectedRegistration} ticketTypes={ticketTypes} pricingType={pricingType} basePrice={basePrice} sessions={sessions} meals={meals} accommodation={accommodation} historicalConfiguration={historicalConfiguration} timeZone={timeZone} onClose={() => setSelectedRegistration(null)} /> : null}
    </RegistrationsPanel>
  );
}

function WalkInRegistration({ eventId, ticketTypes, sessions, sessionsEnabled, modules = null, meals = null, accommodation = null, onSuccess }: { eventId: string; ticketTypes: Event["ticket_types"]; sessions: Event["sessions"]; sessionsEnabled: boolean; modules?: Event["modules"]; meals?: Event["meals"]; accommodation?: Event["accommodation"]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<unknown>(null);
  const queryClient = useQueryClient();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [ticket, setTicket] = useState(""); const [session, setSession] = useState("");
  const [mealSelections, setMealSelections] = useState<string[]>([]); const [accommodationSelections, setAccommodationSelections] = useState<string[]>([]);
  const registrationForm = useQuery({ queryKey: ["event-registration-form", eventId], queryFn: () => getEventRegistrationForm(eventId), enabled: open, staleTime: 60_000, retry: 1 });
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const quote = useQuery({ queryKey: ["event-checkout-quote", eventId, ticket, mealSelections, accommodationSelections], queryFn: () => quoteEventCheckout(eventId, { ticket_type_id: ticket, quantity: 1, meal_selections: mealSelections, accommodation_selections: accommodationSelections }), enabled: open && Boolean(ticket), staleTime: 0, retry: 0 });
  const mutation = useMutation({ mutationFn: () => createEventWalkIn(eventId, { participant_name: name.trim(), participant_email: email.trim(), ticket_type_id: ticket || null, ...(session ? { session_id: session } : {}), custom_fields: customFields, meal_selections: mealSelections, accommodation_selections: accommodationSelections, check_in: modules?.check_in === true }), onSuccess: async (result) => { setSuccessResult(result); setName(""); setEmail(""); setTicket(""); setSession(""); await Promise.all([queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] }), queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] }), queryClient.invalidateQueries({ queryKey: ["events", "dashboard", eventId] }), queryClient.invalidateQueries({ queryKey: ["event-attendance", eventId] }), queryClient.invalidateQueries({ queryKey: ["event-orders", eventId] })]); onSuccess(); } });
  if (!open) return <button type="button" onClick={() => { setSuccessResult(null); setOpen(true); }} className="mt-3 h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white">Register walk-in</button>;
  if (successResult) return <div className="mt-3 rounded-xl border border-[#b7dfc7] bg-[#f1fbf4] p-4"><p className="font-bold text-[#1f6a58]">Walk-In Registered</p><WalkInSuccessDetails result={successResult} /><button type="button" onClick={() => setSuccessResult(null)} className="mt-3 h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white">Register another walk-in</button></div>;
  const options = (kind: "meals" | "accommodation") => (kind === "meals" ? meals?.options ?? [] : accommodation?.options ?? []);
  const toggle = (kind: "meals" | "accommodation", id: string) => { const setter = kind === "meals" ? setMealSelections : setAccommodationSelections; setter((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); };
  const serviceOptions = (kind: "meals" | "accommodation") => modules?.[kind] === true && options(kind).length ? <fieldset className="md:col-span-4"><legend className="text-sm font-bold">{kind === "meals" ? "Meals" : "Accommodation"}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{options(kind).map((option) => { const selected = (kind === "meals" ? mealSelections : accommodationSelections).includes(option.id); const disabled = !option.active || option.sold_out === true; return <label key={option.id} className="rounded-xl border border-[#d7e5df] p-3 text-sm"><input type="checkbox" checked={selected} disabled={disabled} onChange={() => toggle(kind, option.id)} /> <span className="font-semibold">{option.name}</span>{option.description ? <span className="block text-xs text-[#52736a]">{option.description}</span> : null}<span className="block text-xs text-[#52736a]">{option.price ?? "Not provided"} {option.currency ?? ""}{option.remaining_capacity !== undefined && option.remaining_capacity !== null ? ` · ${option.remaining_capacity} remaining` : ""}{option.sold_out ? " · Sold out" : !option.active ? " · Inactive" : ""}</span></label>; })}</div></fieldset> : null;
  return <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="mt-3 grid gap-3 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 md:grid-cols-4"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Participant name" className="h-10 rounded-lg border border-[#d7e5df] px-3 text-sm" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="h-10 rounded-lg border border-[#d7e5df] px-3 text-sm" /><select value={ticket} onChange={(event) => setTicket(event.target.value)} className="h-10 rounded-lg border border-[#d7e5df] px-3 text-sm"><option value="">Select ticket</option>{ticketTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{sessionsEnabled && sessions.length > 0 ? <label className="text-sm font-semibold text-[#31594d]"><span className="mb-1 block">Session (optional)</span><select aria-label="Session (optional)" value={session} onChange={(event) => setSession(event.target.value)} className="h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm"><option value="">No session</option>{sessions.map((item) => item.id ? <option key={item.id} value={item.id}>{item.title}</option> : null)}</select></label> : null}{serviceOptions("meals")}{serviceOptions("accommodation")}{quote.data ? <div className="md:col-span-4 rounded-xl border border-[#d7e5df] bg-white p-3 text-sm"><p>Ticket: {quote.data.ticket_subtotal} · Meals: {quote.data.meal_subtotal} · Accommodation: {quote.data.accommodation_subtotal}</p><p>Discount: {quote.data.discount ?? 0} · Tax: {quote.data.tax ?? 0} · <strong>Total: {quote.data.grand_total} {quote.data.currency}</strong></p></div> : null}{quote.isFetching ? <p className="md:col-span-4 text-sm">Quoting…</p> : null}{quote.isError ? <p role="alert" className="md:col-span-4 text-sm font-semibold text-[#b42318]">Unable to quote this selection. Refresh and try again.</p> : null}<div className="md:col-span-4 flex items-center gap-3"><button type="submit" disabled={mutation.isPending || quote.isFetching || Boolean(ticket && !quote.data)} className="h-10 rounded-full bg-[#1f6a58] px-4 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60">{mutation.isPending ? "Registering..." : "Register"}</button><button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold">Cancel</button>{mutation.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{mutation.error instanceof EventsApiError ? mutation.error.message : "Unable to register walk-in."}</p> : null}</div></form>;
}

function humanizeRegistrationStatus(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, " ");
  return normalized ? normalized.replace(/\b\w/g, (character) => character.toUpperCase()) : "Status unavailable";
}

function WalkInSuccessDetails({ result }: { result: unknown }) {
  if (!result || typeof result !== "object") return <p className="mt-2 text-sm text-[#31594d]">Registration created successfully.</p>;
  const record = result as Record<string, unknown>;
  const registration = record.registration && typeof record.registration === "object" ? record.registration as Record<string, unknown> : record;
  const ticket = record.ticket && typeof record.ticket === "object" ? record.ticket as Record<string, unknown> : null;
  const payment = record.payment && typeof record.payment === "object" ? record.payment as Record<string, unknown> : null;
  const checkIn = record.check_in && typeof record.check_in === "object" ? record.check_in as Record<string, unknown> : null;
  const sessionCheckIn = record.session_check_in && typeof record.session_check_in === "object" ? record.session_check_in as Record<string, unknown> : null;
  const value = (source: Record<string, unknown> | null, ...keys: string[]) => { const found = keys.map((key) => source?.[key]).find((item) => item !== undefined && item !== null && item !== ""); return found === undefined ? null : String(found); };
  return <div className="mt-2 space-y-1 text-sm text-[#31594d]">{value(registration, "registration_reference", "reference") ? <p>Registration Reference: {value(registration, "registration_reference", "reference")}</p> : null}{value(ticket, "qr_code") ? <p>QR: {value(ticket, "qr_code")}</p> : null}{value(payment, "status", "payment_status") ? <p>Payment: {value(payment, "status", "payment_status")}</p> : null}{value(checkIn, "status", "outcome", "reason") ? <p>Check-in: {value(checkIn, "status", "outcome", "reason")}</p> : null}{value(sessionCheckIn, "status", "outcome", "reason") ? <p>Session Check-in: {value(sessionCheckIn, "status", "outcome", "reason")}</p> : null}{!value(registration, "registration_reference", "reference") && !value(ticket, "qr_code") && !value(payment, "status", "payment_status") && !value(checkIn, "status", "outcome", "reason") && !value(sessionCheckIn, "status", "outcome", "reason") ? <p>Registration created successfully.</p> : null}</div>;
}

function isActiveRegistration(registration: { status: string }): boolean {
  const status = registration.status.trim().toLowerCase().replace(/[_-]+/g, " ");
  return status !== "cancelled" && status !== "canceled";
}

function getRegistrationRefundState(status: string): "refund_requested" | "refunded" | undefined {
  if (status === "refunded") return "refunded";
  if (status === "refund_requested") return "refund_requested";
  return undefined;
}

function RegistrationTable({
  eventId,
  registrations,
  totalRegistrations,
  search,
  onSearchChange,
  onSelect,
  sessions,
  ticketTypes,
  pricingType,
  basePrice,
}: {
  eventId: string;
  registrations: readonly EventRegistration[];
  totalRegistrations: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (registration: EventRegistration) => void;
  sessions: Event["sessions"];
  ticketTypes: Event["ticket_types"];
  pricingType?: Event["pricing_type"];
  basePrice: string | null;
}) {
  const countLabel = totalRegistrations === 1 ? "registered participant" : "registered participants";
  return <section className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="w-full sm:max-w-sm"><span className="sr-only">Search registrations</span><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search attendees by name or email" className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label><p aria-live="polite" className="text-sm text-[#52736a]">{search.trim() ? registrations.length + " of " + totalRegistrations + " registrations" : totalRegistrations + " " + countLabel}</p></div>{registrations.length === 0 ? <div className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-8 text-center"><p className="text-sm font-bold text-[#06201c]">No registrations found.</p></div> : <div className="overflow-x-auto"><table className="min-w-[900px] w-full table-fixed text-left text-sm"><thead className="border-y border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[.08em] text-[#52736a]"><tr><th className="w-[28%] px-3 py-2">Attendee</th><th className="w-[17%] px-3 py-2">Ticket</th><th className="w-[16%] px-3 py-2">Registration</th><th className="w-[15%] px-3 py-2">Check-in</th><th className="w-[16%] px-3 py-2">Registered at</th><th className="w-[100px] px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{registrations.map((registration) => { const ticket = getRegistrationTicketLabel(registration, ticketTypes, pricingType, basePrice); const session = sessions.find((item) => item.id === registration.session_id); const checkIn = registration.checked_out_at ? "Checked out" : registration.checked_in_at ? "Checked in" : "Not checked in"; return <tr key={registration.id} onClick={() => onSelect(registration)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(registration); } }} role="button" tabIndex={0} className="cursor-pointer border-b border-[#edf3f0] text-[#06201c] last:border-b-0 hover:bg-[#f4faf7]"><td className="px-3 py-2.5"><div className="truncate font-semibold">{registration.participant_name}</div><div className="truncate text-xs text-[#52736a]">{registration.participant_email}</div></td><td className="px-3 py-2.5 text-[#52736a]">{ticket}</td><td className="px-3 py-2.5"><span className="inline-flex rounded-full bg-[#edf3f0] px-2.5 py-1 text-xs font-semibold text-[#31594d]">{humanizeRegistrationStatus(registration.status)}</span></td><td className="px-3 py-2.5"><div className="font-semibold">{checkIn}</div>{registration.checked_in_at ? <div className="text-xs text-[#52736a]">{formatEventDateTime(registration.checked_in_at, "UTC")}</div> : null}</td><td className="px-3 py-2.5 text-[#52736a]">{formatEventDateTime(registration.created_at, "UTC")}</td><td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}><EventRefundAction eventId={eventId} target="registration" targetId={registration.id} refundState={getRegistrationRefundState(registration.status)} /></td></tr>; })}</tbody></table></div>}</section>;
}

function RegistrationsHeader({
  activeSubview,
  isExporting,
  onExport,
}: {
  activeSubview: RegistrationsSubview;
  isExporting: boolean;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-bold text-[#06201c]">Registrations</h2>
      {activeSubview === "registered" ? (
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          aria-busy={isExporting}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] transition hover:bg-[#e8f6ee] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? "Exporting..." : "Export CSV"}
        </button>
      ) : null}
    </div>
  );
}

function formatRegistrationValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "None selected";
  if (Array.isArray(value)) return value.length ? value.map((item) => formatRegistrationValue(item)).join(", ") : "None selected";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => formatRegistrationValue(item)).join(", ");
  if (typeof value === "object") return "—";
  return String(value);
}

function registrationAnswerEntries(value: EventAttendeeAnswers): Array<[string, unknown]> {
  if (Array.isArray(value)) {
    return value.map((answer: EventAttendeeAnswer, index) => [answer.label?.trim() || answer.question?.trim() || answer.question_id?.trim() || answer.key?.trim() || `Answer ${index + 1}`, answer.value !== undefined ? answer.value : answer.answer]);
  }
  return Object.entries(value).map(([key, answer]) => {
    if (answer && typeof answer === "object" && !Array.isArray(answer)) {
      const record = answer as EventAttendeeAnswer;
      return [record.label?.trim() || record.question?.trim() || record.question_id?.trim() || record.key?.trim() || key, record.value !== undefined ? record.value : record.answer];
    }
    return [key, answer];
  });
}

function RegistrationDetailsDrawer({ registration, ticketTypes, pricingType, basePrice, sessions, meals, accommodation, historicalConfiguration, timeZone, onClose }: { registration: EventRegistration; ticketTypes: Event["ticket_types"]; pricingType?: Event["pricing_type"]; basePrice: string | null; sessions: Event["sessions"]; meals: Event["meals"]; accommodation: Event["accommodation"]; historicalConfiguration?: ActiveEventFormConfiguration; timeZone: string; onClose: () => void }) {
  const fields = historicalConfiguration?.sections.flatMap((section) => section.fields) ?? [];
  const ticket = ticketTypes.find((item) => item.id === registration.ticket_type_id);
  const session = sessions.find((item) => item.id === registration.session_id);
  const fieldLabel = (key: string) => fields.find((field) => field.id === key || field.stable_key === key)?.label ?? key;
  const customEntries = registrationAnswerEntries(registration.custom_fields ?? {});
  const mealOptions = meals?.options ?? [];
  const accommodationOptions = accommodation?.options ?? [];
  return <div className="fixed inset-0 z-50"><button type="button" aria-label="Close attendee details" className="absolute inset-0 bg-[#06201c]/30" onClick={onClose} /><aside role="dialog" aria-modal="true" aria-label="Attendee Details" className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">Registration</p><h2 className="mt-1 text-xl font-bold text-[#06201c]">Attendee Details</h2></div><button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-bold text-[#52736a] hover:bg-[#f4faf7]">Close</button></div><section className="mt-6 space-y-2"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">Participant</h3><DetailRow label="Name" value={registration.participant_name} /><DetailRow label="Email" value={registration.participant_email} /></section><section className="mt-6 space-y-2"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">Registration</h3><DetailRow label="Status" value={humanizeRegistrationStatus(registration.status)} /><DetailRow label="Reference" value={registration.registration_reference ?? "—"} /><DetailRow label="Source" value={registration.registration_source ?? "—"} /><DetailRow label="Payment" value={registration.payment_status ?? "—"} /><DetailRow label="Ticket" value={getRegistrationTicketLabel(registration, ticketTypes, pricingType, basePrice)} /><DetailRow label="Registered" value={formatEventDateTime(registration.created_at, timeZone)} />{registration.session_id ? <DetailRow label="Session" value={session?.title ?? "Unknown session"} /> : null}</section><section className="mt-6 space-y-2"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">Attendance</h3><DetailRow label="Check-in" value={registration.checked_in_at ? formatEventDateTime(registration.checked_in_at, timeZone) : "Not checked in"} />{registration.checked_out_at ? <DetailRow label="Checked out" value={formatEventDateTime(registration.checked_out_at, timeZone)} /> : null}{registration.session_attendance?.map((item) => <DetailRow key={item.session_id} label={`${item.title} attendance`} value={item.checked_out_at ? "Checked out" : item.checked_in ? "Checked in" : "Not checked in"} />)}</section><PurchasedServices registration={registration} meals={mealOptions} accommodation={accommodationOptions} /><section className="mt-6 space-y-2"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">Registration Answers</h3>{customEntries.length === 0 ? <p className="text-sm text-[#52736a]">No registration answers</p> : customEntries.map(([key, value]) => <DetailRow key={key} label={fieldLabel(key)} value={formatRegistrationValue(value)} />)}</section></aside></div>;
}

function PurchasedServices({ registration, meals, accommodation }: { registration: EventRegistration; meals: readonly MealOption[]; accommodation: readonly AccommodationOption[] }) {
  const resolveOption = (selection: string | EventAttendeeServiceSelection, options: readonly (MealOption | AccommodationOption)[]) => {
    if (typeof selection === "string") return options.find((option) => option.id === selection) ?? { id: selection, name: selection };
    return { ...selection, id: selection.id ?? selection.meal_id ?? selection.accommodation_id ?? selection.name ?? "Selected service", name: selection.name ?? selection.id ?? selection.meal_id ?? selection.accommodation_id ?? "Selected service" };
  };
  const selectedMeals = (registration.meal_selections ?? []).map((selection) => resolveOption(selection, meals));
  const selectedAccommodation = (registration.accommodation_selections ?? []).map((selection) => resolveOption(selection, accommodation));
  const hasSelections = selectedMeals.length > 0 || selectedAccommodation.length > 0;
  const optionRows = (title: string, options: readonly { id: string; name: string; price?: string | number | null; currency?: string | null }[]) => options.length ? <div className="space-y-1"><h4 className="text-sm font-semibold text-[#06201c]">{title}</h4>{options.map((option) => <DetailRow key={option.id} label={option.name} value={[option.price, option.currency].filter(Boolean).join(" ") || "Price not provided"} />)}</div> : null;
  return <section className="mt-6 space-y-3"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">Purchased Services</h3>{hasSelections ? <>{optionRows("Meals", selectedMeals)}{optionRows("Accommodation", selectedAccommodation)}</> : <p className="text-sm text-[#52736a]">No purchased services</p>}</section>;
}

function getRegistrationTicketLabel(registration: EventRegistration, ticketTypes: Event["ticket_types"], pricingType?: Event["pricing_type"], basePrice?: string | null): string {
  if (registration.ticket_type_name?.trim()) return registration.ticket_type_name;
  const ticket = ticketTypes.find((item) => item.id === registration.ticket_type_id);
  if (ticket) return ticket.name;
  if (pricingType === "paid" && basePrice !== null && basePrice !== undefined && basePrice.trim() !== "") return "Standard Ticket";
  if (pricingType === "free" && !registration.ticket_type_id) return "Free Admission";
  return registration.ticket_type_id ? registration.ticket_type_id : "Unknown ticket";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-0.5 rounded-xl bg-[#f9fcfa] px-3 py-2"><span className="text-xs font-semibold text-[#7f9d94]">{label}</span><span className="break-words text-sm font-semibold text-[#06201c]">{value}</span></div>;
}

function RegistrationsSubviewTabs({
  activeSubview,
  onChange,
}: {
  activeSubview: RegistrationsSubview;
  onChange: (subview: RegistrationsSubview) => void;
}) {
  return (
    <div
      className="mt-5 border-b border-[#e1ebe6]"
      role="tablist"
      aria-label="Registration participant views"
    >
      {registrationsSubviews.map((subview, index) => (
        <button
          key={subview.id}
          id={`event-registrations-${subview.id}-tab`}
          type="button"
          role="tab"
          aria-selected={activeSubview === subview.id}
          aria-controls={`event-registrations-${subview.id}-panel`}
          tabIndex={activeSubview === subview.id ? 0 : -1}
          onClick={() => onChange(subview.id)}
          onKeyDown={(event) =>
            handleRegistrationsSubviewKeyDown(event, index, onChange)
          }
          className={`mr-5 border-b-2 px-1 pb-2 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2 ${activeSubview === subview.id ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a] hover:text-[#06201c]"}`}
        >
          {subview.label}
        </button>
      ))}
    </div>
  );
}
function handleRegistrationsSubviewKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  onChange: (subview: RegistrationsSubview) => void,
) {
  const lastIndex = registrationsSubviews.length - 1;
  const nextIndex =
    event.key === "ArrowRight"
      ? (currentIndex + 1) % registrationsSubviews.length
      : event.key === "ArrowLeft"
        ? (currentIndex - 1 + registrationsSubviews.length) %
          registrationsSubviews.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? lastIndex
            : null;
  if (nextIndex === null) return;
  onChange(registrationsSubviews[nextIndex].id);
  window.requestAnimationFrame(() =>
    document
      .getElementById(
        `event-registrations-${registrationsSubviews[nextIndex].id}-tab`,
      )
      ?.focus(),
  );
  event.preventDefault();
}
function RegistrationsPanel({
  header,
  navigation,
  subview,
  error,
  children,
}: {
  header: React.ReactNode;
  navigation: React.ReactNode;
  subview: RegistrationsSubview;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      {header}
      {navigation}
      <div
        id={`event-registrations-${subview}-panel`}
        role="tabpanel"
        aria-labelledby={`event-registrations-${subview}-tab`}
      >
        {error ? (
          <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">
            {error}
          </p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}
function sanitizeDownloadFilename(value: string | null): string | null {
  if (!value) return null;
  const safeValue = value
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
    .trim()
    .replace(/^\.+/, "");
  return safeValue && safeValue.toLowerCase().endsWith(".csv")
    ? safeValue
    : null;
}

function EventFulfilmentSection({ eventId }: { eventId: string }) {
  const query = useQuery({ queryKey: ["event-fulfilment", eventId], queryFn: () => getEventFulfilment(eventId), enabled: Boolean(eventId), staleTime: 30_000, retry: 1 });
  if (query.isLoading) return <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-5">Loading fulfilment…</section>;
  if (query.isError || !query.data) return <section className="mt-6 rounded-2xl border border-[#f0d5d1] bg-[#fff8f7] p-5"><p role="alert" className="font-semibold text-[#8f241b]">Unable to load Event fulfilment.</p><button type="button" onClick={() => void query.refetch()} className="mt-2 text-sm font-bold text-[#8f241b] underline">Retry</button></section>;
  const summaries = [...(query.data.meals ?? []).map((item) => ({ ...item, type: "Meal", id: item.meal_id })), ...(query.data.accommodation ?? []).map((item) => ({ ...item, type: "Accommodation", id: item.accommodation_id }))];
  return <section className="mt-6 space-y-5"><DetailSection title="Event Services / Fulfilment"><div className="space-y-3">{summaries.map((item) => <article key={`${item.type}-${item.id}`} className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3"><div className="flex justify-between gap-3"><p className="font-semibold">{item.name}</p><span className="text-xs font-bold">{item.sold_out ? "Sold out" : item.active ? "Available" : "Inactive"}</span></div><p className="mt-1 text-sm text-[#52736a]">{item.type} · {item.price ?? "Not provided"} {item.currency ?? ""} · Capacity: {item.capacity ?? "Unlimited"}</p><p className="text-sm text-[#52736a]">Selected: {item.selected_count}{item.reserved_count !== undefined && item.reserved_count !== null ? ` · Reserved: ${item.reserved_count}` : ""}{item.remaining_capacity !== undefined && item.remaining_capacity !== null ? ` · Remaining: ${item.remaining_capacity}` : ""}</p></article>)}</div></DetailSection><DetailSection title="Purchases"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="border-b border-[#e1ebe6] text-xs uppercase text-[#52736a]"><tr>{["Participant", "Email", "Option", "Quantity", "Price", "Total", "Registration", "Payment", "Order"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody>{(query.data.purchases ?? []).map((purchase) => <tr key={`${purchase.registration_id}-${purchase.option_id}`} className="border-b border-[#edf3f0]"><td className="px-3 py-3">{purchase.participant_name}</td><td className="px-3 py-3">{purchase.participant_email}</td><td className="px-3 py-3">{purchase.option_name}</td><td className="px-3 py-3">{purchase.quantity}</td><td className="px-3 py-3">{purchase.unit_price} {purchase.currency}</td><td className="px-3 py-3">{purchase.line_total} {purchase.currency}</td><td className="px-3 py-3">{purchase.registration_status}</td><td className="px-3 py-3">{purchase.payment_status}</td><td className="px-3 py-3">{purchase.order_id ?? "—"}</td></tr>)}</tbody></table></div>{query.data.purchases?.length ? null : <p className="text-sm text-[#52736a]">No service purchases recorded.</p>}</DetailSection></section>;
}

function EventServicesDetails({ event }: { event: Event }) {
  const meals = event.meals?.options ?? [];
  const accommodation = event.accommodation?.options ?? [];
  if (meals.length === 0 && accommodation.length === 0) return null;
  return <DetailSection title="Event Services"><div className="grid gap-5 lg:grid-cols-2"><ServiceOptions title="Meals" options={meals} timeZone={event.time_zone} /><ServiceOptions title="Accommodation" options={accommodation} timeZone={event.time_zone} /></div></DetailSection>;
}

function ServiceOptions({ title, options, timeZone }: { title: string; options: readonly { id: string; name: string; description?: string | null; date?: string | null; active: boolean; price?: string | null; currency?: string | null; capacity?: string | null; purchase_start_at?: string | null; purchase_end_at?: string | null; service_start_at?: string | null; service_end_at?: string | null; remaining_capacity?: number | null; sold_out?: boolean | null }[]; timeZone: string }) {
  return <section><h3 className="font-bold text-[#06201c]">{title}</h3>{options.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">No options configured.</p> : <div className="mt-3 min-w-0 space-y-3">{options.map((option) => <article key={option.id} className="min-w-0 overflow-hidden rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3"><div className="flex min-w-0 items-start justify-between gap-3"><p className="min-w-0 break-words font-semibold text-[#06201c] [overflow-wrap:anywhere]">{option.name}</p><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${option.active ? "bg-[#e8f6ee] text-[#1f6a58]" : "bg-[#f1f4f3] text-[#52736a]"}`}>{option.active ? "Active" : "Inactive"}</span></div>{option.description ? <p className="mt-1 break-words whitespace-pre-wrap text-sm text-[#52736a] [overflow-wrap:anywhere]">{option.description}</p> : null}<div className="mt-2 grid min-w-0 gap-2 text-xs text-[#52736a] sm:grid-cols-2"><p className="break-words [overflow-wrap:anywhere]">Price: {option.price || "Not provided"} {option.currency || ""}</p><p className="break-words [overflow-wrap:anywhere]">Capacity: {option.capacity || "Not provided"}</p>{option.remaining_capacity !== undefined && option.remaining_capacity !== null ? <p className="break-words [overflow-wrap:anywhere]">Remaining capacity: {option.remaining_capacity}</p> : null}{option.sold_out !== undefined && option.sold_out !== null ? <p className="break-words [overflow-wrap:anywhere]">Status: {option.sold_out ? "Sold out" : "Available"}</p> : null}</div>{option.date ? <p className="mt-1 break-words text-xs font-semibold text-[#52736a] [overflow-wrap:anywhere]">Date: {formatEventDate(option.date, timeZone)}</p> : null}<p className="mt-1 break-words text-xs text-[#52736a] [overflow-wrap:anywhere]">Purchase: {formatServiceWindow(option.purchase_start_at, option.purchase_end_at, timeZone)}</p><p className="break-words text-xs text-[#52736a] [overflow-wrap:anywhere]">Service: {formatServiceWindow(option.service_start_at, option.service_end_at, timeZone)}</p></article>)}</div>}</section>;
}

function formatServiceWindow(start: string | null | undefined, end: string | null | undefined, timeZone: string) { if (!start && !end) return "Not provided"; return `${start ? formatEventDateTime(start, timeZone) : "Not provided"} – ${end ? formatEventDateTime(end, timeZone) : "Not provided"}`; }

function DetailSection({
  title,
  children,
  secondary = false,
}: {
  title: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border ${secondary ? "border-[#edf3f0] bg-[#f9fcfa]" : "border-[#e1ebe6] bg-white shadow-sm"} p-5`}
    >
      <h2 className="text-lg font-bold text-[#06201c]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <DetailValue key={item.label} {...item} />
      ))}
    </div>
  );
}
function DetailValue({ label, value }: DetailItem) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-[#06201c]">
        {displayValue(value)}
      </p>
    </div>
  );
}
function Tags({ values }: { values: string[] }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
        Tags
      </p>
      {values.length === 0 ? (
        <p className="mt-1 text-sm font-semibold text-[#06201c]">None</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
function ExternalValue({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const href = validUrl(value) ? value : null;
  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block min-w-0 max-w-full whitespace-normal break-all text-sm font-semibold text-[#1f6a58] underline"
        >
          {href}
        </a>
      ) : (
        <p className="mt-1 text-sm font-semibold text-[#06201c]">
          {displayValue(value)}
        </p>
      )}
    </div>
  );
}
function MediaList({
  label,
  values,
  empty,
  kind,
}: {
  label: string;
  values: EventMediaItem[];
  empty: string;
  kind: "image" | "video" | "document";
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
        {label}
      </p>
      {values.length === 0 ? (
        <p className="mt-1 text-sm font-semibold text-[#06201c]">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {values.map((value, index) => (
            <li key={`${mediaItemUrl(value)}-${index}`}>
              {kind === "image" ? <MediaImage label={`Image ${index + 1}`} value={value} /> : kind === "video" ? <MediaVideo value={value} /> : <MediaDocument value={value} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function MediaImage({ label, value }: { label: string; value: EventMediaItem }) {
  return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label}</p><div className="mt-2">{mediaItemUrl(value) ? <EventMediaPreview item={value} kind="image" label={label} /> : <p className="text-sm font-semibold text-[#52736a]">No image available</p>}</div></div>;
}
function MediaVideo({ value }: { value: EventMediaItem }) {
  return <EventMediaPreview item={value} kind="video" label="Event video" />;
}
function MediaDocument({ value }: { value: EventMediaItem }) {
  return <EventMediaPreview item={value} kind="document" label="Event document" />;
}
function TicketTypes({ event }: { event: Event }) {
  return event.ticket_types.length === 0 ? (
    <Empty label="No ticket types configured" />
  ) : (
    <div className="grid gap-3 md:grid-cols-2">
      {event.ticket_types.map((ticket) => (
        <div
          key={ticket.id}
          className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-4"
        >
          <DetailGrid
            items={[
              { label: "Name", value: ticket.name },
              { label: "ID", value: ticket.id },
              { label: "Price", value: ticket.price },
              { label: "Currency", value: ticket.currency },
              { label: "Capacity", value: ticket.capacity },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
function SessionsSection({
  eventId,
  deliveryMode,
  startDate,
  endDate,
  enabled,
  sessionField = null,
}: {
  eventId: string;
  deliveryMode: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
  sessionField?: ActiveEventFormField | null;
}) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<EventSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<EventSession | null>(null);
  const [newSessions, setNewSessions] = useState<SessionDraft[]>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sessionsQuery = useQuery({
    queryKey: ["event-sessions", eventId],
    queryFn: () => getEventSessions(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });
  const addMutation = useMutation({
    mutationFn: (payload: AddEventSessionPayload) =>
      addEventSession(eventId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["event-sessions", eventId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "detail", eventId],
        }),
      ]);
      setIsDialogOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: string; payload: UpdateEventSessionPayload }) => updateEventSession(eventId, sessionId, payload),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["event-sessions", eventId] }), queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] })]);
      setEditingSession(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteEventSession(eventId, sessionId),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["event-sessions", eventId] }), queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] })]);
      setDeletingSession(null);
    },
  });
  const saveNewSessions = async (drafts: SessionDraft[]) => {
    const payloads = drafts.map((session) => ({
      session_date: session.session_date,
      title: session.title.trim(),
      description: session.description.trim() || null,
      speaker: session.speaker.trim() || null,
      speaker_bio: session.speaker_bio.trim() || null,
      start_time: session.start_time || null,
      end_time: session.end_time || null,
      location: session.location.trim() || null,
      meeting_link: session.meeting_link?.trim() || null,
    }));
    for (let index = 0; index < payloads.length; index += 1) {
      try {
        await addEventSession(eventId, payloads[index]);
      } catch (caught) {
        setNewSessions(drafts.slice(index));
        await sessionsQuery.refetch();
        throw new Error(index === 0 ? "Could not save new sessions. Please correct the highlighted rows and retry." : `Saved ${index} session${index === 1 ? "" : "s"}; the remaining rows were not saved.`);
      }
    }
    setNewSessions([]);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["event-sessions", eventId] }),
      queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] }),
    ]);
  };
  return (
    <div>
      <div>
        {sessionsQuery.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-label="Loading sessions"
            className="space-y-3"
          >
            <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
            <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
          </div>
        ) : sessionsQuery.isError ? (
          <>
            <p role="alert" className="text-sm font-semibold text-[#b42318]">
              Couldn&apos;t load sessions.
            </p>
            <button
              type="button"
              onClick={() => void sessionsQuery.refetch()}
              className="mt-3 text-sm font-semibold text-[#1f6a58] underline"
            >
              Retry
            </button>
          </>
        ) : !sessionsQuery.data ? (
          <div
            role="status"
            aria-live="polite"
            aria-label="Loading sessions"
            className="space-y-3"
          >
            <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
            <div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" />
          </div>
        ) : <>{!enabled ? <p role="status" className="mb-4 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-3 text-sm font-semibold text-[#52736a]">Sessions are disabled for this Event.</p> : null}<SessionTableEditor
          mode="manage"
          eventStart={startDate}
          eventEnd={endDate}
          deliveryMode={deliveryMode}
          sessions={newSessions}
          persistedSessions={sessionsQuery.data}
          enabledFields={sessionField?.composite_config?.enabled_fields ?? undefined}
          requiredFields={sessionField?.composite_config?.required_fields ?? []}
          label={sessionField?.label ?? "Sessions / Agenda"}
          onSessionsChange={setNewSessions}
          onAddSession={() => setIsDialogOpen(true)}
          onEditPersisted={(session) => setEditingSession(session as EventSession)}
          onDeletePersisted={(session) => setDeletingSession(session as EventSession)}
          disabled={!enabled}
          renderPersistedActions={enabled ? (session) => <SessionCalendarDownloadAction eventId={eventId} sessionId={session.id} /> : undefined}
          onSaveNewSessions={saveNewSessions}
        /></>}
      </div>
      {isDialogOpen || editingSession ? (
        <AddSessionDialog
          mode={editingSession ? "edit" : "add"}
          initialSession={editingSession}
          startDate={startDate}
          endDate={endDate}
          sessionField={sessionField}
          deliveryMode={deliveryMode}
          isPending={editingSession ? updateMutation.isPending : addMutation.isPending}
          error={editingSession ? updateMutation.error : addMutation.error}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingSession(null);
            window.requestAnimationFrame(() => triggerRef.current?.focus());
          }}
          onSubmit={(payload) => editingSession ? updateMutation.mutate({ sessionId: editingSession.id, payload }) : addMutation.mutate(payload as AddEventSessionPayload)}
        />
      ) : null}
      {deletingSession ? <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 sm:items-center sm:justify-center sm:p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="delete-session-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl"><h2 id="delete-session-title" className="text-lg font-bold text-[#06201c]">Delete session?</h2><p className="mt-2 text-sm text-[#52736a]">&quot;{deletingSession.title}&quot; will be removed from this event&apos;s agenda.</p>{deleteMutation.error ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">Couldn&apos;t delete session. Please try again.</p> : null}<div className="mt-5 flex justify-end gap-3"><button type="button" disabled={deleteMutation.isPending} onClick={() => setDeletingSession(null)} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold">Cancel</button><button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletingSession.id)} className="h-10 rounded-full bg-[#b42318] px-4 text-sm font-bold text-white">{deleteMutation.isPending ? "Deleting..." : "Delete Session"}</button></div></div></div> : null}
    </div>
  );
}
function AddSessionDialog({
  mode = "add",
  initialSession = null,
  startDate,
  endDate,
  sessionField = null,
  deliveryMode,
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  mode?: "add" | "edit";
  initialSession?: EventSession | null;
  startDate: string;
  endDate: string;
  sessionField?: ActiveEventFormField | null;
  deliveryMode: string;
  isPending: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (payload: AddEventSessionPayload | UpdateEventSessionPayload) => void;
}) {
  const dates = getEventSessionDates(startDate, endDate);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [values, setValues] = useState({
    session_date: initialSession?.session_date ?? (dates.length === 1 ? dates[0] : ""),
    title: initialSession?.title ?? "",
    description: initialSession?.description ?? "",
    speaker: initialSession?.speaker ?? "",
    speaker_bio: initialSession?.speaker_bio ?? "",
    start_time: initialSession?.start_time ?? "",
    end_time: initialSession?.end_time ?? "",
    location: initialSession?.location ?? "",
    meeting_link: initialSession?.meeting_link ?? "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const bounds = getSessionTimeBounds(values.session_date, startDate, endDate);
  const fieldEnabled = (name: SessionSubfield) => isSessionSubfieldEnabled(sessionField, name) && isDeliveryFieldApplicable(name, deliveryMode);
  const fieldRequired = (name: SessionSubfield) => isSessionSubfieldRequired(sessionField, name) && isDeliveryFieldApplicable(name, deliveryMode);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (fieldRequired("session_date") && !values.session_date) {
      setValidationError("Select a session date.");
      return;
    }
    if (fieldRequired("title") && !values.title.trim()) {
      setValidationError("Title is required.");
      return;
    }
    if (
      (fieldEnabled("start_time") && values.start_time &&
        (values.start_time < bounds.min || values.start_time > bounds.max)) ||
      (fieldEnabled("end_time") && values.end_time &&
        (values.end_time < bounds.min || values.end_time > bounds.max))
    ) {
      setValidationError(
        values.session_date === getEventSessionDates(startDate, endDate)[0]
          ? `The event starts at ${bounds.min} on this date.`
          : `The event ends at ${bounds.max} on this date.`,
      );
      return;
    }
    if (
      fieldEnabled("start_time") && fieldEnabled("end_time") && values.start_time &&
      values.end_time &&
      values.end_time <= values.start_time
    ) {
      setValidationError("End time must be later than start time.");
      return;
    }
    setValidationError(null);
    const normalized = Object.fromEntries(Object.entries({
      session_date: values.session_date,
      title: values.title.trim(),
      description: values.description.trim() || null,
      speaker: values.speaker.trim() || null,
      speaker_bio: values.speaker_bio.trim() || null,
      start_time: values.start_time || null,
      end_time: values.end_time || null,
      location: values.location.trim() || null,
      meeting_link: values.meeting_link.trim() || null,
    }).filter(([key]) => fieldEnabled(key as SessionSubfield))) as unknown as AddEventSessionPayload;
    if (mode === "add") {
      onSubmit(normalized);
      return;
    }
    const original = {
      session_date: initialSession?.session_date ?? "",
      title: initialSession?.title ?? "",
      description: initialSession?.description ?? "",
      speaker: initialSession?.speaker ?? "",
      speaker_bio: initialSession?.speaker_bio ?? "",
      start_time: initialSession?.start_time ?? "",
      end_time: initialSession?.end_time ?? "",
      location: initialSession?.location ?? "",
      meeting_link: initialSession?.meeting_link ?? "",
    };
    const payload = Object.fromEntries(
      Object.entries(normalized).filter(([key, value]) => value !== original[key as keyof typeof original]),
    ) as UpdateEventSessionPayload;
    if (Object.keys(payload).length > 0) onSubmit(payload);
  };
  const update =
    (field: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValidationError(null);
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 sm:items-center sm:justify-center sm:p-5"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-session-title"
        aria-describedby="add-session-description"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isPending) {
            onClose();
            return;
          }
          trapSessionDialogFocus(event);
        }}
        className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <h2 id="add-session-title" className="text-lg font-bold text-[#06201c]">
          {mode === "edit" ? "Edit Session" : "Add Session"}
        </h2>
        <p id="add-session-description" className="mt-2 text-sm text-[#52736a]">
          {mode === "edit" ? "Update this agenda item." : "Add an agenda item to this event."}
        </p>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          {fieldEnabled("session_date") ? <label className="block text-sm font-bold text-[#06201c]">
            Session date{fieldRequired("session_date") ? " *" : ""}
            <select
              value={values.session_date}
              onChange={update("session_date")}
              aria-invalid={Boolean(validationError)}
              className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            >
              <option value="" disabled>
                Select a date
              </option>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {formatSessionDate(date)}
                </option>
              ))}
            </select>
          </label> : null}
          {fieldEnabled("title") ? <label className="block text-sm font-bold text-[#06201c]">
            Title{fieldRequired("title") ? " *" : ""}
            <input
              ref={titleRef}
              value={values.title}
              onChange={update("title")}
              className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            />
          </label> : null}
          {fieldEnabled("description") ? <label className="block text-sm font-bold text-[#06201c]">
            Description{fieldRequired("description") ? " *" : ""}
            <textarea value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-[#d7e5df] px-3 py-2 font-normal" />
          </label> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {fieldEnabled("speaker") ? <SessionInput
              label="Speaker"
              required={fieldRequired("speaker")}
              value={values.speaker}
              onChange={update("speaker")}
            /> : null}
            {fieldEnabled("speaker_bio") ? <label className="block text-sm font-bold text-[#06201c]">
              Speaker bio{fieldRequired("speaker_bio") ? " *" : ""}
              <textarea value={values.speaker_bio} onChange={(event) => setValues((current) => ({ ...current, speaker_bio: event.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-[#d7e5df] px-3 py-2 font-normal" />
            </label> : null}
            {fieldEnabled("start_time") ? <SessionInput
              label="Start time"
              required={fieldRequired("start_time")}
              type="time"
              value={values.start_time}
              onChange={update("start_time")}
              min={bounds.min}
              max={bounds.max}
            /> : null}
            {fieldEnabled("end_time") ? <SessionInput
              label="End time"
              required={fieldRequired("end_time")}
              type="time"
              value={values.end_time}
              onChange={update("end_time")}
              min={bounds.min}
              max={bounds.max}
            /> : null}
            {fieldEnabled("location") ? <SessionInput
              label="Location"
              required={fieldRequired("location")}
              value={values.location}
              onChange={update("location")}
            /> : null}
          </div>
          {validationError ? (
            <p role="alert" className="text-sm font-semibold text-[#b42318]">
              {validationError}
            </p>
          ) : null}
          {fieldEnabled("meeting_link") ? <SessionInput
            label="Meeting link"
            required={fieldRequired("meeting_link")}
            value={values.meeting_link}
            onChange={update("meeting_link")}
          /> : null}
          {error ? (
            <p role="alert" className="text-sm font-semibold text-[#b42318]">
              {getAddSessionErrorMessage(error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isPending || (mode === "edit" && Object.keys(Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== ({ session_date: initialSession?.session_date ?? "", title: initialSession?.title ?? "", description: initialSession?.description ?? "", speaker: initialSession?.speaker ?? "", speaker_bio: initialSession?.speaker_bio ?? "", start_time: initialSession?.start_time ?? "", end_time: initialSession?.end_time ?? "", location: initialSession?.location ?? "", meeting_link: initialSession?.meeting_link ?? "" })[key as keyof typeof values]))).length === 0)}
              onClick={onClose}
              className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {isPending ? (mode === "edit" ? "Saving..." : "Adding...") : (mode === "edit" ? "Save Changes" : "Add Session")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function trapSessionDialogFocus(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled])",
    ),
  );
  const currentIndex = focusable.findIndex(
    (element) => element === document.activeElement,
  );
  const nextIndex = event.shiftKey
    ? (currentIndex - 1 + focusable.length) % focusable.length
    : (currentIndex + 1) % focusable.length;
  focusable[nextIndex]?.focus();
  event.preventDefault();
}
function SessionInput({
  label,
  type = "text",
  value,
  onChange,
  min,
  max,
  required = false,
}: {
  label: string;
  type?: "text" | "time";
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-[#06201c]">
      {label}{required ? " *" : ""}
      <input
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required={required}
        className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
      />
    </label>
  );
}
function getAddSessionErrorMessage(error: Error) {
  if (!(error instanceof EventsApiError))
    return "Couldn't add session. Please try again.";
  if (error.status === 401 || error.status === 403)
    return "You do not have permission to add sessions.";
  if (error.status === 404) return "This event no longer exists.";
  if (error.status === 409) return "This session cannot be added right now.";
  if (error.status === 422)
    return (
      error.fieldErrors.title?.[0] ?? "Please correct the session details."
    );
  return "Couldn't add session. Please try again.";
}
function CustomFields({ event }: { event: Event }) {
  return event.custom_fields.length === 0 ? (
    <Empty label="No custom registration fields configured" />
  ) : (
    <div className="grid gap-3 md:grid-cols-2">
      {event.custom_fields.map((field, index) => (
        <div
          key={`${field.label}-${index}`}
          className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-4"
        >
          <DetailGrid
            items={[
              { label: "Label", value: field.label },
              { label: "Type", value: field.type },
              {
                label: "Options",
                value:
                  field.options.length > 0 ? field.options.join(", ") : "None",
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <p className="text-sm font-semibold text-[#52736a]">{label}</p>;
}
function validUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
function EventDetailsSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-28 rounded-2xl bg-[#edf3f0]" />
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-40 rounded-2xl bg-[#f1f4f3]" />
      ))}
    </div>
  );
}
function EventDetailsError({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const status = error instanceof EventsApiError ? error.status : null;
  const message =
    status === 404
      ? "Event not found."
      : status === 401 || status === 403
        ? "You do not have access to this event."
        : "Unable to load event.";
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
      <p className="text-base font-bold text-[#06201c]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-3 text-sm font-semibold text-[#1f6a58] underline"
      >
        Try again
      </button>
    </section>
  );
}
