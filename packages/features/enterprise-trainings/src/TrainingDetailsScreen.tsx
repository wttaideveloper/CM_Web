"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import ProgressSummaryCard from "./ProgressSummaryCard";
import TrainingActionsMenu from "./TrainingActionsMenu";
import { ParticipantDashboardCard, ProviderDashboardCard } from "./dashboard-cards";
import { TrainingAssessmentsTab, TrainingAttendanceTab, TrainingContentTab, TrainingEnrolmentsTab, TrainingLiveTab, TrainingSectionsTab } from "./TrainingDetailsSections";
import { displayValue, formatTrainingDate, formatTrainingPrice, humanizeLabel } from "./detail-formatters";
import { getTrainingStatusBadgeClass, getTrainingStatusLabel } from "./training-status";
import { getTrainingAdminNotes, getTrainingById, getTrainingProgress, getTrainingSections, listTrainingEnrolments, downloadTrainingDownloads, downloadTrainingNotesPdf, getTrainingMeetingLink, getTrainingModerationHistory, publishTrainingEnterprise, getTrainingParticipantDashboard, getTrainingProviderDashboard, TrainingsApiError } from "./trainings.service";
import TrainingCalendarAction from "./TrainingCalendarAction";

type TrainingDetailsTab = "details" | "content" | "sections" | "enrolments" | "attendance" | "assessments" | "live" | "dashboards";

const trainingDetailsTabs: ReadonlyArray<{ id: TrainingDetailsTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "content", label: "Content" },
  { id: "sections", label: "Sessions & Lessons" },
  { id: "enrolments", label: "Enrolments" },
  { id: "attendance", label: "Attendance" },
  { id: "assessments", label: "Assessments" },
  { id: "live", label: "Live & Discussions" },
  { id: "dashboards", label: "Dashboards" },
];

/** Shows the latest super-admin reject / request-changes note on the Training detail page. */
function AdminNoteBanner({ trainingId, status }: { trainingId: string; status: string }) {
  const adminNotesQuery = useQuery({
    queryKey: ["trainings", trainingId, "admin-notes"],
    queryFn: () => getTrainingAdminNotes(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
    retry: 1,
  });
  const data = adminNotesQuery.data;
  if (adminNotesQuery.isLoading || adminNotesQuery.isError || !data) return null;
  let note: string | null = null;
  let by: string | null = null;
  if (typeof data === "string") {
    note = data.trim() || null;
  } else if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    note = [record.note, record.message, record.reason, record.comment, record.notes].find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
    by = typeof record.performed_by === "string" && record.performed_by.trim() ? record.performed_by : typeof record.admin_name === "string" && record.admin_name.trim() ? record.admin_name : null;
  }
  if (!note) return null;
  return (
    <div role="status" className="mt-6 rounded-2xl border border-[#eadbb8] bg-[#fffaf0] px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a5a00]">{status === "needs_revision" ? "Changes requested" : "Not approved"}{by ? ` by ${by}` : ""}</p>
      <p className="mt-1 text-sm leading-6 text-[#6b5a1e]">{note}</p>
    </div>
  );
}

function ParticipantToolbar({ trainingId, status, trainingMeetingLink }: { trainingId: string; status: string; trainingMeetingLink?: string | null }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [moderationExpanded, setModerationExpanded] = useState(false);
  const fileDownload = (data: { blob: Blob; filename: string | null }, fallback: string, success: string) => {
    const url = URL.createObjectURL(data.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = data.filename || fallback;
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback(success);
  };

  const downloadsMutation = useMutation({
    mutationFn: () => downloadTrainingDownloads(trainingId),
    onSuccess: (data) => fileDownload(data, `training-${trainingId}-downloads`, "Training downloads started."),
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to download training content."),
  });

  const notesMutation = useMutation({
    mutationFn: () => downloadTrainingNotesPdf(trainingId),
    onSuccess: (data) => fileDownload(data, `training-${trainingId}-notes.pdf`, "Training notes downloaded."),
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to download training notes."),
  });

  const meetingMutation = useMutation({
    mutationFn: () => getTrainingMeetingLink(trainingId),
    onSuccess: (data) => {
      const record = data && typeof data === "object" ? data as Record<string, unknown> : null;
      const link =
        typeof data === "string"
          ? data
          : typeof record?.meeting_link === "string"
            ? record.meeting_link
            : typeof record?.url === "string"
              ? record.url
              : null;
      if (typeof link === "string" && link) {
        setMeetingLink(link);
        setFeedback("Meeting link loaded.");
      } else {
        const trainingLink = typeof trainingMeetingLink === "string" ? trainingMeetingLink.trim() : "";
        if (trainingLink) {
          setMeetingLink(trainingLink);
          setFeedback("Meeting link loaded from the training configuration.");
        } else {
          setFeedback("No meeting link available.");
        }
      }
    },
    onError: (error) => {
      const trainingLink = typeof trainingMeetingLink === "string" ? trainingMeetingLink.trim() : "";
      if (trainingLink) {
        setMeetingLink(trainingLink);
        setFeedback("Meeting link loaded from the training configuration.");
      } else {
        setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to get meeting link.");
      }
    },
  });

  const moderationQuery = useQuery({
    queryKey: ["trainings", trainingId, "moderation-history"],
    queryFn: () => getTrainingModerationHistory(trainingId),
    enabled: moderationExpanded && Boolean(trainingId),
    staleTime: 30_000,
  });

  const moderationHistory = Array.isArray(moderationQuery.data) ? moderationQuery.data : [];

  return (
    <div className="mt-4 rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrainingCalendarAction trainingId={trainingId} />
        <button type="button" onClick={() => downloadsMutation.mutate()} disabled={downloadsMutation.isPending} className="h-9 rounded-full border border-[#1f6a58] px-4 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-60">
          {downloadsMutation.isPending ? "..." : "Downloads"}
        </button>
        <button type="button" onClick={() => notesMutation.mutate()} disabled={notesMutation.isPending} className="h-9 rounded-full border border-[#8a5a00] px-4 text-xs font-bold text-[#8a5a00] hover:bg-[#fffaf0] disabled:opacity-60">
          {notesMutation.isPending ? "..." : "Notes PDF"}
        </button>
        <button type="button" onClick={() => {
          const trainingLink = typeof trainingMeetingLink === "string" ? trainingMeetingLink.trim() : "";
          if (trainingLink) {
            setMeetingLink(trainingLink);
            setFeedback("Meeting link loaded from the training configuration.");
          } else {
            meetingMutation.mutate();
          }
        }} disabled={meetingMutation.isPending} className="h-9 rounded-full border border-[#7c3aed] px-4 text-xs font-bold text-[#7c3aed] hover:bg-[#f5f3ff] disabled:opacity-60">
          {meetingMutation.isPending ? "..." : "Meeting Link"}
        </button>
        <button type="button" onClick={() => setModerationExpanded(!moderationExpanded)} className="h-9 rounded-full border border-[#d7e5df] px-4 text-xs font-bold text-[#52736a] hover:bg-white">
          {moderationExpanded ? "Hide" : "Moderation History"}
        </button>
      </div>
      {feedback ? <p role="status" className="mt-3 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-2 text-xs font-semibold text-[#167550]">{feedback}</p> : null}
      {meetingLink ? (
        <div className="mt-3 rounded-xl border border-[#d8c9f5] bg-[#faf8ff] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#6b4bb5]">Training meeting link</p>
          <a href={meetingLink} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-[#5b3fa3] underline">{meetingLink}</a>
        </div>
      ) : null}
      {moderationExpanded ? (
        <div className="mt-3 space-y-2">
          {moderationQuery.isLoading ? <p className="text-xs text-[#52736a]">Loading...</p> : null}
          {moderationHistory.length === 0 && !moderationQuery.isLoading ? <p className="text-xs text-[#7f9d94]">No moderation history.</p> : null}
          {moderationHistory.map((raw, index) => {
            const record = raw as Record<string, unknown>;
            const action = typeof record.action === "string" ? record.action : typeof record.status === "string" ? record.status : "";
            const note = [record.note, record.message, record.reason, record.comment].find((v): v is string => typeof v === "string" && v.trim().length > 0);
            const performedBy = typeof record.performed_by === "string" ? record.performed_by : null;
            const performedAt = typeof record.created_at === "string" ? record.created_at : null;
            return (
              <div key={index} className="rounded-xl border border-[#e1ebe6] bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">{humanizeLabel(action)}</span>
                  {performedBy ? <span className="text-[10px] text-[#7f9d94]">by {performedBy}</span> : null}
                  {performedAt ? <span className="text-[10px] text-[#7f9d94]">{formatTrainingDate(performedAt)}</span> : null}
                </div>
                {note ? <p className="mt-1 text-xs text-[#52736a]">{note}</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  const normalizedValue = value.trim().toLowerCase();
  if (
    !normalizedValue ||
    normalizedValue === "—" ||
    normalizedValue === "undefined" ||
    normalizedValue === "null" ||
    /^not provided(?:\s+not provided)*$/.test(normalizedValue)
  ) {
    return null;
  }

  return (
    <div className="training-detail-item">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#06201c]">{value}</p>
    </div>
  );
}

function DetailGroupHeading({ children }: { children: string }) {
  return (
    <div className="training-detail-group-heading col-span-full border-b border-[#edf3f0] pb-2 pt-2 first:pt-0">
      <h4 className="text-sm font-bold text-[#1f6a58]">{children}</h4>
    </div>
  );
}

interface TrainingDetailsScreenProps {
  managementActions?: boolean;
}

/** Renders every supported field from a single authenticated Training response. */
export default function TrainingDetailsScreen({
  managementActions = true,
}: TrainingDetailsScreenProps) {
  const { trainingId } = useParams<{ trainingId: string }>();
  const [activeTab, setActiveTab] = useState<TrainingDetailsTab>("details");
  const trainingQuery = useQuery({
    queryKey: ["trainings", "detail", trainingId],
    queryFn: () => getTrainingById(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
    retry: 1,
  });

  const sectionsQuery = useQuery({
    queryKey: ["trainings", trainingId, "sections"],
    queryFn: () => getTrainingSections(trainingId),
    enabled: activeTab === "details" && Boolean(trainingId),
    retry: false,
  });

  const enrolmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "enrolments"],
    queryFn: () => listTrainingEnrolments(trainingId),
    enabled: activeTab === "details" && Boolean(trainingId),
    retry: false,
  });

  const progressQuery = useQuery({
    queryKey: ["trainings", trainingId, "progress"],
    queryFn: () => getTrainingProgress(trainingId),
    enabled: Boolean(trainingId),
    retry: false,
  });

  if (trainingQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm" aria-live="polite" aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded-lg bg-[#edf3f0]" />
          <div className="h-4 w-1/2 rounded bg-[#edf3f0]" />
          <div className="h-32 rounded-xl bg-[#edf3f0]" />
          <div className="h-20 rounded-xl bg-[#edf3f0]" />
        </div>
        <p className="sr-only">Loading training…</p>
      </div>
    );
  }

  if (trainingQuery.isError) {
    return (
      <div className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] px-8 py-12 text-center shadow-sm" role="alert">
        <p className="mt-3 text-base font-bold text-[#b42318]">We could not load this training</p>
        <p className="mt-2 text-sm leading-5 text-[#6b5a52]">{(trainingQuery.error as Error).message || "It may have been deleted or you don’t have access. Try again or go back to Trainings."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => void trainingQuery.refetch()} className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#195646]">Try again</button>
          <a href="/admin/trainings" className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">Back to Trainings</a>
        </div>
      </div>
    );
  }

  if (!trainingQuery.data) return null;

  const training = trainingQuery.data;
  const sections = Array.isArray(sectionsQuery.data) ? (sectionsQuery.data as Array<Record<string, unknown>>) : [];
  const enrolments = Array.isArray(enrolmentsQuery.data) ? enrolmentsQuery.data : [];
  const lessonCount = sections.reduce((total, section) => total + (Array.isArray(section.lessons) ? section.lessons.length : 0), 0);

  return (
    <div className="w-full">
      {typeof training.primary_image === "string" && training.primary_image.trim().length > 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-[#e1ebe6] shadow-sm">
          <img alt={training.title} className="h-56 w-full object-cover sm:h-64" src={training.primary_image.trim()} onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/80">{training.category || "TRAINING"}</p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{training.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${getTrainingStatusBadgeClass(training.status)}`}>{getTrainingStatusLabel(training.status)}</span>
              {typeof training.subcategory === "string" && training.subcategory ? <span className="text-xs text-white/70">{training.subcategory}</span> : null}
              {typeof training.delivery_mode === "string" && training.delivery_mode ? <span className="text-xs text-white/70">{humanizeLabel(training.delivery_mode)}</span> : null}
            </div>
          </div>
          {managementActions ? (
            <div className="absolute top-4 right-4">
              <TrainingActionsMenu training={training} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{training.category || "TRAINING"}</p>
            <h2 className="mt-1 text-2xl font-bold text-[#06201c] sm:text-3xl">{training.title}</h2>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${getTrainingStatusBadgeClass(training.status)}`}>{getTrainingStatusLabel(training.status)}</span>
          </div>
          {managementActions ? <TrainingActionsMenu training={training} /> : null}
        </div>
      )}

      {(training.status === "rejected" || training.status === "needs_revision") ? <AdminNoteBanner trainingId={trainingId} status={training.status} /> : null}

      {managementActions ? (
        <ParticipantToolbar
          trainingId={trainingId}
          status={training.status}
          trainingMeetingLink={typeof (training as unknown as Record<string, unknown>).meeting_link === "string" ? String((training as unknown as Record<string, unknown>).meeting_link) : null}
        />
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#e1ebe6] overflow-x-auto scrollbar-thin">
        {trainingDetailsTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === tab.id ? "border-b-2 border-[#1f6a58] bg-[#f0faf5] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa] hover:text-[#1f6a58]"}`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "details" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#06201c]">Details</h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <DetailGroupHeading>Overview / Basic Information</DetailGroupHeading>
              <DetailItem label="Category" value={displayValue(training.category)} />
              <DetailItem label="Subcategory" value={displayValue(training.subcategory)} />
              <DetailItem label="Delivery mode" value={training.delivery_mode ? humanizeLabel(training.delivery_mode) : "Not provided"} />
              <DetailItem label="Course type" value={training.course_type ? humanizeLabel(training.course_type) : "Not provided"} />
              <DetailGroupHeading>Pricing & Capacity</DetailGroupHeading>
              <DetailItem label="Price" value={formatTrainingPrice(training.price, training.currency)} />
              <DetailItem label="Capacity" value={displayValue(training.capacity)} />
              <DetailItem label="Enrolled" value={displayValue(String((training as unknown as Record<string, unknown>).enrolled_count ?? "—"))} />
              <DetailItem label="Available slots" value={displayValue(String((training as unknown as Record<string, unknown>).available_slots ?? "—"))} />
              <DetailGroupHeading>Instructor & Delivery</DetailGroupHeading>
              <DetailItem label="Instructor" value={displayValue(training.instructor_id)} />
              <DetailItem label="Instructor name" value={displayValue((training as unknown as Record<string, unknown>).instructor_name as string)} />
              <DetailItem label="Instructor bio" value={displayValue((training as unknown as Record<string, unknown>).instructor_bio as string)} />
              <DetailItem label="Venue" value={displayValue((training as unknown as Record<string, unknown>).venue as string)} />
              <DetailItem label="Address" value={displayValue((training as unknown as Record<string, unknown>).address as string)} />
              <DetailItem label="Meeting link" value={displayValue((training as unknown as Record<string, unknown>).meeting_link as string)} />
              <DetailItem label="Delivery instructions" value={displayValue((training as unknown as Record<string, unknown>).delivery_instructions as string)} />
              <DetailGroupHeading>Schedule</DetailGroupHeading>
              <DetailItem label="Start date" value={displayValue(training.start_date as string)} />
              <DetailItem label="Start time" value={displayValue((training as unknown as Record<string, unknown>).start_time as string)} />
              <DetailItem label="End date" value={displayValue(training.end_date as string)} />
              <DetailItem label="End time" value={displayValue((training as unknown as Record<string, unknown>).end_time as string)} />
              <DetailGroupHeading>Additional Configuration</DetailGroupHeading>
              <DetailItem label="Learning objectives" value={Array.isArray((training as unknown as Record<string, unknown>).learning_objectives) ? ((training as unknown as Record<string, unknown>).learning_objectives as string[]).join(", ") : "—"} />
              <DetailItem label="PDFs" value={Array.isArray((training as unknown as Record<string, unknown>).documents) ? ((training as unknown as Record<string, unknown>).documents as unknown[]).length + " files" : Array.isArray(training.documents) ? (training.documents as unknown[]).length + " files" : "—"} />
              <DetailItem label="Prerequisites" value={displayValue((training as unknown as Record<string, unknown>).prerequisites as string)} />
              <DetailItem label="Release rule" value={((): string => { const v = (training as unknown as Record<string, unknown>).release_rule; if (typeof v === "string") return v; if (v && typeof v === "object" && typeof (v as Record<string, unknown>).type === "string") return (v as Record<string, unknown>).type as string; return "Not provided"; })()} />
              <DetailItem label="Randomise" value={String((training as unknown as Record<string, unknown>).randomise ?? (training as unknown as Record<string, unknown>).randomize ?? "—")} />
              <DetailItem label="Scheduled publication" value={displayValue((training as unknown as Record<string, unknown>).scheduled_publication as string)} />
              <DetailItem label="Mandatory" value={String((training as unknown as Record<string, unknown>).is_mandatory ?? "—")} />
              <DetailItem label="Group enrolment" value={String((training as unknown as Record<string, unknown>).group_enrolment ?? "—")} />
              <DetailItem label="Max group size" value={displayValue((training as unknown as Record<string, unknown>).max_group_size as string)} />
              <DetailItem label="Access expiry" value={displayValue((training as unknown as Record<string, unknown>).access_expiry_type as string) + " " + displayValue((training as unknown as Record<string, unknown>).access_expiry_days as string)} />
              <DetailItem label="Recurring" value={displayValue((training as unknown as Record<string, unknown>).recurring as string)} />
              <DetailItem label="Schedule exceptions" value={Array.isArray((training as unknown as Record<string, unknown>).schedule_exceptions) ? ((training as unknown as Record<string, unknown>).schedule_exceptions as unknown[]).length + " exceptions" : displayValue((training as unknown as Record<string, unknown>).schedule_exceptions as string)} />
              <DetailItem label="Access information" value={displayValue((training as unknown as Record<string, unknown>).access_information as string)} />
              <DetailItem label="Meeting provider" value={displayValue((training as unknown as Record<string, unknown>).meeting_provider as string)} />
              <DetailItem label="Waitlist count" value={displayValue(String((training as unknown as Record<string, unknown>).waitlist_count ?? "—"))} />
              <DetailItem label="Subtitle" value={displayValue((training as unknown as Record<string, unknown>).subtitle as string)} />
              <DetailItem label="Instructor (object)" value={(() => { const ins = (training as unknown as Record<string, unknown>).instructor as Record<string, unknown> | null; return ins ? `${displayValue(ins.name as string)}${ins.role ? ` (${ins.role})` : ""}` : displayValue((training as unknown as Record<string, unknown>).instructor_name as string); })()} />
              <DetailItem label="Instructor role" value={displayValue((training as unknown as Record<string, unknown>).instructor_role as string) || displayValue(((training as unknown as Record<string, unknown>).instructor as Record<string, unknown> | null)?.role as string)} />
              <DetailItem label="Instructor photo" value={displayValue((training as unknown as Record<string, unknown>).instructor_photo as string)} />
              <DetailItem label="Instructor credentials" value={displayValue((training as unknown as Record<string, unknown>).instructor_credentials as string)} />
              <DetailItem label="FAQs" value={Array.isArray((training as unknown as Record<string, unknown>).faqs) ? `${((training as unknown as Record<string, unknown>).faqs as unknown[]).length} questions` : displayValue((training as unknown as Record<string, unknown>).faqs as string)} />
              <DetailItem label="Badges" value={Array.isArray((training as unknown as Record<string, unknown>).badges) ? ((training as unknown as Record<string, unknown>).badges as unknown[]).map(String).join(", ") || "—" : "—"} />
              <DetailItem label="Notes PDF" value={displayValue((training as unknown as Record<string, unknown>).notes_pdf_url as string)} />
              <DetailItem label="Target audience" value={displayValue((training as unknown as Record<string, unknown>).target_audience as string)} />
              <DetailItem label="Difficulty" value={displayValue((training as unknown as Record<string, unknown>).difficulty_level as string) || displayValue((training as unknown as Record<string, unknown>).level as string)} />
              <DetailItem label="Offline enabled" value={String((training as unknown as Record<string, unknown>).offline_enabled ?? (training as unknown as Record<string, unknown>).offline_access_enabled ?? "—")} />
              <DetailItem label="Session mode" value={displayValue((training as unknown as Record<string, unknown>).session_mode as string)} />
              <DetailItem label="Check-in" value={String((training as unknown as Record<string, unknown>).check_in ?? "—")} />
              <DetailItem label="Pass code" value={displayValue((training as unknown as Record<string, unknown>).pass_code as string)} />
              <DetailItem label="Discussions" value={Array.isArray((training as unknown as Record<string, unknown>).discussions) ? `${((training as unknown as Record<string, unknown>).discussions as unknown[]).length} threads` : displayValue((training as unknown as Record<string, unknown>).discussions as string)} />
              <DetailItem label="Announcements" value={Array.isArray((training as unknown as Record<string, unknown>).announcements) ? `${((training as unknown as Record<string, unknown>).announcements as unknown[]).length} items` : displayValue((training as unknown as Record<string, unknown>).announcements as string)} />
              <DetailItem label="PDFs" value={Array.isArray((training as unknown as Record<string, unknown>).documents) ? `${((training as unknown as Record<string, unknown>).documents as unknown[]).length} pdfs` : "—"} />
              <DetailItem label="Duration" value={displayValue((training as unknown as Record<string, unknown>).duration as string)} />
              <DetailItem label="Time zone" value={displayValue((training as unknown as Record<string, unknown>).time_zone as string)} />
              <DetailItem label="Enrolment start" value={displayValue((training as unknown as Record<string, unknown>).enrolment_start as string)} />
              <DetailItem label="Enrolment end" value={displayValue((training as unknown as Record<string, unknown>).enrolment_end as string)} />
              <DetailGroupHeading>Record Information</DetailGroupHeading>
              <DetailItem label="Created" value={formatTrainingDate(training.created_at)} />
              <DetailItem label="Updated" value={formatTrainingDate(training.updated_at)} />
            </div>
            {training.description?.trim() ? (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Description</p>
                <p className="mt-2 text-sm leading-6 text-[#52736a]">{training.description}</p>
              </div>
            ) : null}
            {Array.isArray(training.tags) && training.tags.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {training.tags.map((tag) => (
                    <span key={String(tag)} className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{String(tag)}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {Array.isArray((training as unknown as Record<string, unknown>).badges) && ((training as unknown as Record<string, unknown>).badges as unknown[]).length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Milestone badges</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {((training as unknown as Record<string, unknown>).badges as unknown[]).map((badge, i) => (
                    <span key={`${String(badge)}-${i}`} className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#2563eb]">★ {String(typeof badge === "object" && badge !== null ? ((badge as Record<string, unknown>).title ?? (badge as Record<string, unknown>).name ?? "") : badge)}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {Array.isArray((training as unknown as Record<string, unknown>).faqs) && ((training as unknown as Record<string, unknown>).faqs as unknown[]).length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">FAQs</p>
                <div className="mt-2 space-y-2">
                  {((training as unknown as Record<string, unknown>).faqs as Array<Record<string, unknown>>).map((faq, i) => {
                    const q = typeof faq.question === "string" ? faq.question : typeof faq.q === "string" ? faq.q : "";
                    const a = typeof faq.answer === "string" ? faq.answer : typeof faq.a === "string" ? faq.a : "";
                    return (
                      <div key={i} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                        <p className="text-sm font-bold text-[#06201c]">{q || `Question ${i + 1}`}</p>
                        {a ? <p className="mt-1 text-sm text-[#52736a]">{a}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <style jsx global>{`
              .training-detail-group-heading:not(:has(+ .training-detail-item)) {
                display: none;
              }
            `}</style>
          </section>
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#06201c]">Structure</h3>
              <div className="mt-4 grid gap-3">
                <DetailItem label="Sessions" value={String(sections.length)} />
                <DetailItem label="Lessons" value={String(lessonCount)} />
                <DetailItem label="Enrolments" value={String(enrolments.length)} />
              </div>
            </section>
            {Array.isArray((training as unknown as Record<string, unknown>).sessions) && ((training as unknown as Record<string, unknown>).sessions as unknown[]).length > 0 ? (
              <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#06201c]">Sessions</h3>
                <p className="mt-1 text-xs text-[#7f9d94]">Legacy sessions carried through edits — never modified here.</p>
                <ul className="mt-3 space-y-2">
                  {((training as unknown as Record<string, unknown>).sessions as Array<Record<string, unknown>>).map((session, i) => {
                    const title = typeof session.title === "string" ? session.title : typeof session.name === "string" ? session.name : `Session ${i + 1}`;
                    const when = typeof session.scheduled_at === "string" ? session.scheduled_at : typeof session.start_date === "string" ? session.start_date : typeof session.date === "string" ? session.date : null;
                    return (
                      <li key={typeof session.id === "string" ? session.id : i} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-2">
                        <p className="text-sm font-bold text-[#06201c]">{title}</p>
                        {when ? <p className="text-xs text-[#7f9d94]">{formatTrainingDate(when)}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Progress</p>
              {progressQuery.isLoading ? <p className="mt-2 text-sm text-[#52736a]">Loading...</p> : <ProgressSummaryCard data={progressQuery.data} />}
            </section>

          </aside>
        </div>
      ) : null}

      {activeTab === "content" ? <TrainingContentTab trainingId={trainingId} /> : null}
      {activeTab === "sections" ? <div className="mt-6"><TrainingSectionsTab trainingId={trainingId} /></div> : null}
      {activeTab === "enrolments" ? <div className="mt-6"><TrainingEnrolmentsTab trainingId={trainingId} /></div> : null}
      {activeTab === "attendance" ? <div className="mt-6"><TrainingAttendanceTab trainingId={trainingId} /></div> : null}
      {activeTab === "assessments" ? <div className="mt-6"><TrainingAssessmentsTab trainingId={trainingId} /></div> : null}
      {activeTab === "live" ? <div className="mt-6"><TrainingLiveTab trainingId={trainingId} /></div> : null}
      {activeTab === "dashboards" ? <div className="mt-6"><TrainingDashboardsTab trainingId={trainingId} /></div> : null}
    </div>
  );
}

function TrainingDashboardsTab({ trainingId }: { trainingId: string }) {
  const participantQuery = useQuery({ queryKey: ["trainings", trainingId, "dashboard", "participant"], queryFn: () => getTrainingParticipantDashboard(trainingId), enabled: Boolean(trainingId), retry: false });
  const providerQuery = useQuery({ queryKey: ["trainings", trainingId, "dashboard", "provider"], queryFn: () => getTrainingProviderDashboard(trainingId), enabled: Boolean(trainingId), retry: false });
  return (
    <div className="grid gap-5">
      {participantQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : participantQuery.isError ? <p className="text-sm text-[#52736a]">Participant dashboard will be available once the training has active participants.</p> : participantQuery.data ? <ParticipantDashboardCard dashboard={participantQuery.data} trainingId={trainingId} /> : null}
      {providerQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : providerQuery.isError ? <p className="text-sm text-[#52736a]">Provider dashboard will be available once the training has active participants.</p> : providerQuery.data ? <ProviderDashboardCard dashboard={providerQuery.data} /> : null}
    </div>
  );
}
