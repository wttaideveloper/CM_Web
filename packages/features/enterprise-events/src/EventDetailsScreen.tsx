"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import EventActionsMenu from "./EventActionsMenu";
import EventAttendanceSection from "./EventAttendanceSection";
import {
  EventCalendarDownloadAction,
  SessionCalendarDownloadAction,
} from "./EventCalendarDownloadActions";
import EventCommunicationsActions from "./EventCommunicationsActions";
import EventRefundAction from "./EventRefundAction";
import EventOrdersSection from "./EventOrdersSection";
import EventReportsSection from "./EventReportsSection";
import {
  displayValue,
  formatEventDate,
  formatEventDateTime,
  formatEventTime,
} from "./event-detail-formatters";
import {
  canEditEvent,
  getEventStatusBadgeClass,
  getEventStatusLabel,
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
  getEventById,
  getEventFeedback,
  getEventRegistrations,
  getEventSessions,
  getEventWaitlist,
  resubmitEvent,
  updateEventSession,
  type AddEventSessionPayload,
  type Event,
  type EventRegistration,
  type EventSession,
  type UpdateEventSessionPayload,
} from "./events.service";

type DetailItem = {
  label: string;
  value: string | number | boolean | null | undefined;
};
type EventDetailsTab = "details" | "registrations" | "attendance" | "feedback" | "reports" | "orders";
type RegistrationsSubview = "registered" | "waitlist";

const eventDetailsTabs: ReadonlyArray<{ id: EventDetailsTab; label: string }> =
  [
    { id: "details", label: "Details" },
    { id: "registrations", label: "Registrations" },
    { id: "attendance", label: "Attendance" },
    { id: "feedback", label: "Feedback" },
    { id: "reports", label: "Reports" },
    { id: "orders", label: "Orders" },
  ];

const registrationsSubviews: ReadonlyArray<{
  id: RegistrationsSubview;
  label: string;
}> = [
  { id: "registered", label: "Registered" },
  { id: "waitlist", label: "Waitlist" },
];

/** Renders every supported field from a single authenticated Event response. */
export default function EventDetailsScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventDetailsTab>("details");
  const eventQuery = useQuery({
    queryKey: ["events", "detail", eventId],
    queryFn: () => getEventById(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });
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
        </div>
      </header>
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
          {(event.status === "needs_revision" || event.status === "rejected") ? (
            <section className="mt-3 max-w-2xl rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3">
              <p className="text-sm font-bold text-[#735c1e]">Admin feedback</p>
              <p className="mt-1 text-sm text-[#735c1e]">{event.last_admin_notes?.trim() || "No additional notes were provided."}</p>
            </section>
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
          {(event.status === "needs_revision" || event.status === "rejected") ? (
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
      <EventDetailsTabs activeTab={activeTab} onChange={setActiveTab} />
      <div
        id="event-details-panel"
        role="tabpanel"
        aria-labelledby="event-details-tab"
        hidden={activeTab !== "details"}
        className="mt-6 space-y-5"
      >
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
              { label: "Delivery Mode", value: event.delivery_mode },
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
          <ExternalValue label="Primary Image" value={event.primary_image} />
          <MediaList
            label="Gallery Images"
            empty="No gallery images"
            values={event.gallery_images}
          />
          <MediaList label="Videos" empty="No videos" values={event.videos} />
          <MediaList
            label="Documents"
            empty="No documents"
            values={event.documents}
          />
        </DetailSection>
        <SessionsSection
          eventId={event.id}
          startDate={event.start_date}
          endDate={event.end_date}
          enabled={activeTab === "details"}
        />
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
      </div>
      {activeTab === "registrations" ? (
        <section
          id="event-registrations-panel"
          role="tabpanel"
          aria-labelledby="event-registrations-tab"
          className="mt-6"
        >
          <RegistrationsSection eventId={event.id} />
        </section>
      ) : null}
      {activeTab === "attendance" ? (
        <section id="event-attendance-panel" role="tabpanel" aria-labelledby="event-attendance-tab" className="mt-6">
          <EventAttendanceSection eventId={event.id} eventStatus={event.status} timeZone={event.time_zone} />
        </section>
      ) : null}
      {activeTab === "feedback" ? (
        <section id="event-feedback-panel" role="tabpanel" aria-labelledby="event-feedback-tab" className="mt-6">
          <FeedbackSection eventId={event.id} />
        </section>
      ) : null}
      {activeTab === "reports" ? (
        <section id="event-reports-panel" role="tabpanel" aria-labelledby="event-reports-tab" className="mt-6">
          <EventReportsSection eventId={event.id} />
        </section>
      ) : null}
      {activeTab === "orders" ? (
        <section id="event-orders-panel" role="tabpanel" aria-labelledby="event-orders-tab" className="mt-6">
          <EventOrdersSection eventId={event.id} timeZone={event.time_zone} />
        </section>
      ) : null}
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
  activeTab,
  onChange,
}: {
  activeTab: EventDetailsTab;
  onChange: (tab: EventDetailsTab) => void;
}) {
  return (
    <div
      className="mt-6 border-b border-[#e1ebe6]"
      role="tablist"
      aria-label="Event details sections"
    >
      {eventDetailsTabs.map((tab, index) => (
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

function RegistrationsSection({ eventId }: { eventId: string }) {
  const [activeSubview, setActiveSubview] =
    useState<RegistrationsSubview>("registered");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [registrationSearch, setRegistrationSearch] = useState("");
  const registrationsQuery = useQuery({
    queryKey: ["event-registrations", eventId],
    queryFn: () => getEventRegistrations(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });
  const waitlistQuery = useQuery({
    queryKey: ["event-waitlist", eventId],
    queryFn: () => getEventWaitlist(eventId),
    enabled: activeSubview === "waitlist" && Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });
  const normalizedRegistrationSearch = registrationSearch.trim().toLocaleLowerCase();
  const filteredRegistrations = useMemo(() => {
    const registrations = registrationsQuery.data ?? [];
    if (!normalizedRegistrationSearch) {
      return registrations;
    }

    return registrations.filter((registration) =>
      registration.participant_name.toLocaleLowerCase().includes(normalizedRegistrationSearch) ||
      registration.participant_email.toLocaleLowerCase().includes(normalizedRegistrationSearch),
    );
  }, [normalizedRegistrationSearch, registrationsQuery.data]);

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
    <RegistrationsHeader
      activeSubview={activeSubview}
      isExporting={isExporting}
      onExport={() => void exportRegistrations()}
    />
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
            <p className="mt-1 text-sm text-[#52736a]">
              The current backend contract does not document waitlist record
              fields for display.
            </p>
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

  if (registrationsQuery.data.length === 0) {
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
      <RegistrationTable
        eventId={eventId}
        registrations={filteredRegistrations}
        totalRegistrations={registrationsQuery.data.length}
        search={registrationSearch}
        onSearchChange={setRegistrationSearch}
      />
    </RegistrationsPanel>
  );
}

function humanizeRegistrationStatus(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, " ");
  return normalized ? normalized.replace(/\b\w/g, (character) => character.toUpperCase()) : "Status unavailable";
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
}: {
  eventId: string;
  registrations: readonly EventRegistration[];
  totalRegistrations: number;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const countLabel = registrations.length === 1 ? "registered participant" : "registered participants";
  return <section className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="w-full sm:max-w-sm"><span className="sr-only">Search registrations</span><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search registrations..." className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" /></label><p aria-live="polite" className="text-sm text-[#52736a]">{search.trim() ? registrations.length + " of " + totalRegistrations + " registrations" : registrations.length + " " + countLabel}</p></div>{registrations.length === 0 ? <div className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-8 text-center"><p className="text-sm font-bold text-[#06201c]">No registrations found.</p></div> : <div className="overflow-x-auto"><table className="min-w-[760px] w-full table-fixed text-left text-sm"><thead className="border-y border-[#e1ebe6] bg-[#f9fcfa] text-xs font-bold uppercase tracking-[.08em] text-[#52736a]"><tr><th scope="col" className="w-12 px-3 py-2">#</th><th scope="col" className="w-[25%] px-3 py-2">Name</th><th scope="col" className="w-[38%] px-3 py-2">Email</th><th scope="col" className="w-[17%] px-3 py-2">Status</th><th scope="col" className="w-[120px] px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{registrations.map((registration, index) => <tr key={registration.id} className="border-b border-[#edf3f0] text-[#06201c] last:border-b-0"><td className="px-3 py-2.5 text-[#52736a]">{index + 1}</td><td className="truncate px-3 py-2.5 font-semibold" title={registration.participant_name}>{registration.participant_name}</td><td className="truncate px-3 py-2.5 text-[#52736a]" title={registration.participant_email}>{registration.participant_email}</td><td className="px-3 py-2.5"><span className="inline-flex rounded-full bg-[#edf3f0] px-2.5 py-1 text-xs font-semibold text-[#31594d]">{humanizeRegistrationStatus(registration.status)}</span></td><td className="px-3 py-2.5"><EventRefundAction eventId={eventId} target="registration" targetId={registration.id} refundState={getRegistrationRefundState(registration.status)} /></td></tr>)}</tbody></table></div>}</section>;
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
          className="mt-1 block break-all text-sm font-semibold text-[#1f6a58] underline"
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
}: {
  label: string;
  values: string[];
  empty: string;
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
          {values.map((value) => (
            <li key={value}>
              <ExternalValue label="Media URL" value={value} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
  startDate,
  endDate,
  enabled,
}: {
  eventId: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<EventSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<EventSession | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sessionsQuery = useQuery({
    queryKey: ["event-sessions", eventId],
    queryFn: () => getEventSessions(eventId),
    enabled: enabled && Boolean(eventId),
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
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-[#06201c]">Sessions / Agenda</h2>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2"
        >
          + Add Session
        </button>
      </div>
      <div className="mt-4">
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
        ) : sessionsQuery.data.length === 0 ? (
          <>
            <Empty label="No sessions added" />
            <p className="mt-1 text-sm text-[#52736a]">
              The agenda for this event will appear here once sessions are
              added.
            </p>
          </>
        ) : (
          <ul className="space-y-3">
            {sessionsQuery.data.map((session, index) => (
              <li
                key={session.id ?? `embedded-session-${index}`}
                className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-4"
              >
                <h3 className="text-sm font-bold text-[#06201c]">
                  {session.title}
                </h3>
                {session.session_date ? (
                  <p className="mt-1 text-sm font-semibold text-[#1f6a58]">
                    {formatSessionDate(session.session_date)}
                  </p>
                ) : null}
                <div className="mt-2 grid gap-2 text-sm text-[#52736a] sm:grid-cols-2">
                  {session.speaker ? <p>Speaker: {session.speaker}</p> : null}
                  {session.start_time ? (
                    <p>Start: {session.start_time}</p>
                  ) : null}
                  {session.end_time ? <p>End: {session.end_time}</p> : null}
                  {session.location ? (
                    <p>Location: {session.location}</p>
                  ) : null}
                  {session.meeting_link ? (
                    <a
                      href={session.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-semibold text-[#1f6a58] underline"
                    >
                      Meeting link
                    </a>
                  ) : null}
                </div>
                {session.id ? (
                  <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setEditingSession(session)} className="text-sm font-semibold text-[#1f6a58] underline">Edit</button><button type="button" onClick={() => setDeletingSession(session)} className="text-sm font-semibold text-[#b42318] underline">Delete</button><SessionCalendarDownloadAction eventId={eventId} sessionId={session.id} /></div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {isDialogOpen || editingSession ? (
        <AddSessionDialog
          mode={editingSession ? "edit" : "add"}
          initialSession={editingSession}
          startDate={startDate}
          endDate={endDate}
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
    </section>
  );
}
function AddSessionDialog({
  mode = "add",
  initialSession = null,
  startDate,
  endDate,
  isPending,
  error,
  onClose,
  onSubmit,
}: {
  mode?: "add" | "edit";
  initialSession?: EventSession | null;
  startDate: string;
  endDate: string;
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
    speaker: initialSession?.speaker ?? "",
    start_time: initialSession?.start_time ?? "",
    end_time: initialSession?.end_time ?? "",
    location: initialSession?.location ?? "",
    meeting_link: initialSession?.meeting_link ?? "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const bounds = getSessionTimeBounds(values.session_date, startDate, endDate);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.session_date) {
      setValidationError("Select a session date.");
      return;
    }
    if (!values.title.trim()) {
      setValidationError("Title is required.");
      return;
    }
    if (
      (values.start_time &&
        (values.start_time < bounds.min || values.start_time > bounds.max)) ||
      (values.end_time &&
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
      values.start_time &&
      values.end_time &&
      values.end_time <= values.start_time
    ) {
      setValidationError("End time must be later than start time.");
      return;
    }
    setValidationError(null);
    const normalized = {
      session_date: values.session_date,
      title: values.title.trim(),
      speaker: values.speaker.trim() || null,
      start_time: values.start_time || null,
      end_time: values.end_time || null,
      location: values.location.trim() || null,
      meeting_link: values.meeting_link.trim() || null,
    };
    if (mode === "add") {
      onSubmit(normalized);
      return;
    }
    const original = {
      session_date: initialSession?.session_date ?? "",
      title: initialSession?.title ?? "",
      speaker: initialSession?.speaker ?? "",
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
          <label className="block text-sm font-bold text-[#06201c]">
            Session date *
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
          </label>
          <label className="block text-sm font-bold text-[#06201c]">
            Title *
            <input
              ref={titleRef}
              value={values.title}
              onChange={update("title")}
              className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <SessionInput
              label="Speaker"
              value={values.speaker}
              onChange={update("speaker")}
            />
            <SessionInput
              label="Start time"
              type="time"
              value={values.start_time}
              onChange={update("start_time")}
              min={bounds.min}
              max={bounds.max}
            />
            <SessionInput
              label="End time"
              type="time"
              value={values.end_time}
              onChange={update("end_time")}
              min={bounds.min}
              max={bounds.max}
            />
            <SessionInput
              label="Location"
              value={values.location}
              onChange={update("location")}
            />
          </div>
          {validationError ? (
            <p role="alert" className="text-sm font-semibold text-[#b42318]">
              {validationError}
            </p>
          ) : null}
          <SessionInput
            label="Meeting link"
            value={values.meeting_link}
            onChange={update("meeting_link")}
          />
          {error ? (
            <p role="alert" className="text-sm font-semibold text-[#b42318]">
              {getAddSessionErrorMessage(error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isPending || (mode === "edit" && Object.keys(Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== ({ session_date: initialSession?.session_date ?? "", title: initialSession?.title ?? "", speaker: initialSession?.speaker ?? "", start_time: initialSession?.start_time ?? "", end_time: initialSession?.end_time ?? "", location: initialSession?.location ?? "", meeting_link: initialSession?.meeting_link ?? "" })[key as keyof typeof values]))).length === 0)}
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
}: {
  label: string;
  type?: "text" | "time";
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block text-sm font-bold text-[#06201c]">
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
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
