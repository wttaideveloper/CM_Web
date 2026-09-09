"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import ProgressSummaryCard from "./ProgressSummaryCard";
import TrainingActionsMenu from "./TrainingActionsMenu";
import { TrainingAssessmentsTab, TrainingAssignmentsTab, TrainingContentTab, TrainingEnrolmentsTab, TrainingLiveTab, TrainingSectionsTab } from "./TrainingDetailsSections";
import { displayValue, formatTrainingDate, formatTrainingPrice, humanizeLabel } from "./detail-formatters";
import { getTrainingStatusBadgeClass, getTrainingStatusLabel } from "./training-status";
import { getTrainingAdminNotes, getTrainingById, getTrainingProgress, getTrainingSections, listTrainingEnrolments, getTrainingCertificate, downloadTrainingCalendar, getTrainingMeetingLink, getTrainingModerationHistory, checkoutTraining, publishTrainingEnterprise, TrainingsApiError } from "./trainings.service";

type TrainingDetailsTab = "details" | "content" | "sections" | "enrolments" | "assessments" | "assignments" | "live";

const trainingDetailsTabs: ReadonlyArray<{ id: TrainingDetailsTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "content", label: "Content" },
  { id: "sections", label: "Sections & Lessons" },
  { id: "enrolments", label: "Enrolments" },
  { id: "assessments", label: "Assessments" },
  { id: "assignments", label: "Assignments" },
  { id: "live", label: "Live & Discussions" },
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

function ParticipantToolbar({ trainingId, status }: { trainingId: string; status: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [moderationExpanded, setModerationExpanded] = useState(false);
  const [certificateEmail, setCertificateEmail] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);

  const certMutation = useMutation({
    mutationFn: () => getTrainingCertificate(trainingId, certificateEmail.trim()),
    onSuccess: (data) => {
      if (data instanceof Blob) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificate-${trainingId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setFeedback("Certificate downloaded.");
        return;
      }
      const record = data as Record<string, unknown> | null;
      const certUrl =
        typeof data === "string"
          ? data
          : typeof record?.certificate_url === "string"
            ? record.certificate_url
            : typeof record?.certificateUrl === "string"
              ? record.certificateUrl
              : typeof record?.url === "string"
                ? record.url
                : typeof record?.download_url === "string"
                  ? record.download_url
                  : null;
      if (certUrl && certUrl.trim()) {
        window.open(certUrl.trim(), "_blank");
        setFeedback("Certificate link opened.");
      } else {
        setFeedback("Certificate is not yet available (backend returns placeholder URL).");
      }
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Unable to download certificate."),
  });

  const calendarMutation = useMutation({
    mutationFn: () => downloadTrainingCalendar(trainingId),
    onSuccess: (data) => {
      const url = URL.createObjectURL(data.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `training-${trainingId}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback("Calendar downloaded.");
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to download calendar."),
  });

  const meetingMutation = useMutation({
    mutationFn: () => getTrainingMeetingLink(trainingId),
    onSuccess: (data) => {
      const link = typeof data === "string" ? data : (data as Record<string, unknown>)?.meeting_link;
      if (typeof link === "string" && link) {
        window.open(link, "_blank");
        setFeedback("Meeting link opened.");
      } else {
        setFeedback("No meeting link available.");
      }
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to get meeting link."),
  });

  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: () => checkoutTraining(trainingId, { participant_name: checkoutName.trim(), participant_email: checkoutEmail.trim() }),
    onSuccess: () => { setFeedback("Checkout initiated."); setCheckoutName(""); setCheckoutEmail(""); setShowCheckout(false); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to checkout."),
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
        <button type="button" onClick={() => calendarMutation.mutate()} disabled={calendarMutation.isPending} className="h-9 rounded-full border border-[#1f6a58] px-4 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-60">
          {calendarMutation.isPending ? "..." : "Download Calendar"}
        </button>
        <button type="button" onClick={() => setShowCertificate((v) => !v)} className="h-9 rounded-full border border-[#2563eb] px-4 text-xs font-bold text-[#2563eb] hover:bg-[#eef4ff]">
          Certificate
        </button>
        <button type="button" onClick={() => meetingMutation.mutate()} disabled={meetingMutation.isPending} className="h-9 rounded-full border border-[#7c3aed] px-4 text-xs font-bold text-[#7c3aed] hover:bg-[#f5f3ff] disabled:opacity-60">
          {meetingMutation.isPending ? "..." : "Meeting Link"}
        </button>
        <button type="button" onClick={() => setShowCheckout(!showCheckout)} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white">
          Enrol & Checkout
        </button>
        <button type="button" onClick={() => setModerationExpanded(!moderationExpanded)} className="h-9 rounded-full border border-[#d7e5df] px-4 text-xs font-bold text-[#52736a] hover:bg-white">
          {moderationExpanded ? "Hide" : "Moderation History"}
        </button>
      </div>
      {feedback ? <p role="status" className="mt-3 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-2 text-xs font-semibold text-[#167550]">{feedback}</p> : null}
      {showCertificate ? (
        <div className="mt-3 rounded-xl border border-[#e1ebe6] bg-white p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Certificate — participant email required</p>
          <div className="flex gap-2">
            <input value={certificateEmail} onChange={(e) => setCertificateEmail(e.target.value)} placeholder="participant@email.com" type="email" className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
            <button type="button" onClick={() => certMutation.mutate()} disabled={certMutation.isPending || !certificateEmail.trim()} className="h-8 rounded-full bg-[#2563eb] px-4 text-xs font-bold text-white disabled:opacity-60">{certMutation.isPending ? "Loading..." : "Download"}</button>
            <button type="button" onClick={() => setShowCertificate(false)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
          </div>
          <p className="text-[11px] text-[#7f9d94]">Backend: GET /trainings/{"{id}"}/certificate?participant_email=... (currently returns placeholder URL, PDF generation not implemented).</p>
        </div>
      ) : null}
      {showCheckout ? (
        <div className="mt-3 rounded-xl border border-[#e1ebe6] bg-white p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Checkout</p>
          <div className="flex gap-2">
            <input value={checkoutName} onChange={(e) => setCheckoutName(e.target.value)} placeholder="Your name" className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
            <input value={checkoutEmail} onChange={(e) => setCheckoutEmail(e.target.value)} placeholder="Your email" type="email" className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
            <button type="button" onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending || !checkoutName.trim() || !checkoutEmail.trim()} className="h-8 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{checkoutMutation.isPending ? "Processing..." : "Submit"}</button>
            <button type="button" onClick={() => setShowCheckout(false)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
          </div>
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
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#06201c]">{value}</p>
    </div>
  );
}

/** Renders every supported field from a single authenticated Training response. */
export default function TrainingDetailsScreen() {
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
  });

  const enrolmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "enrolments"],
    queryFn: () => listTrainingEnrolments(trainingId),
    enabled: activeTab === "details" && Boolean(trainingId),
  });

  const progressQuery = useQuery({
    queryKey: ["trainings", trainingId, "progress"],
    queryFn: () => getTrainingProgress(trainingId),
    enabled: Boolean(trainingId),
  });

  if (trainingQuery.isLoading) {
    return <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">Loading training...</p></div>;
  }

  if (trainingQuery.isError) {
    return <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#b42318]">Unable to load this training.</p><p className="mt-2 text-sm text-[#52736a]">{(trainingQuery.error as Error).message}</p></div>;
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
              {typeof training.delivery_mode === "string" && training.delivery_mode ? <span className="text-xs text-white/70">{training.delivery_mode}</span> : null}
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <TrainingActionsMenu training={training} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{training.category || "TRAINING"}</p>
            <h2 className="mt-1 text-2xl font-bold text-[#06201c] sm:text-3xl">{training.title}</h2>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${getTrainingStatusBadgeClass(training.status)}`}>{getTrainingStatusLabel(training.status)}</span>
          </div>
          <TrainingActionsMenu training={training} />
        </div>
      )}

      {(training.status === "rejected" || training.status === "needs_revision") ? <AdminNoteBanner trainingId={trainingId} status={training.status} /> : null}

      <ParticipantToolbar trainingId={trainingId} status={training.status} />

      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#e1ebe6]">
        {trainingDetailsTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === tab.id ? "border-b-2 border-[#1f6a58] text-[#1f6a58]" : "text-[#52736a] hover:text-[#1f6a58]"}`}
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
              <DetailItem label="Category" value={displayValue(training.category)} />
              <DetailItem label="Subcategory" value={displayValue(training.subcategory)} />
              <DetailItem label="Delivery mode" value={displayValue(training.delivery_mode)} />
              <DetailItem label="Course type" value={displayValue(training.course_type)} />
              <DetailItem label="Price" value={formatTrainingPrice(training.price, training.currency)} />
              <DetailItem label="Capacity" value={displayValue(training.capacity)} />
              <DetailItem label="Instructor" value={displayValue(training.instructor_id)} />
              <DetailItem label="Created" value={formatTrainingDate(training.created_at)} />
              <DetailItem label="Updated" value={formatTrainingDate(training.updated_at)} />
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Description</p>
              <p className="mt-2 text-sm leading-6 text-[#52736a]">{training.description || "—"}</p>
            </div>
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
          </section>
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#06201c]">Structure</h3>
              <div className="mt-4 grid gap-3">
                <DetailItem label="Sections" value={String(sections.length)} />
                <DetailItem label="Lessons" value={String(lessonCount)} />
                <DetailItem label="Enrolments" value={String(enrolments.length)} />
              </div>
            </section>
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
      {activeTab === "assessments" ? <div className="mt-6"><TrainingAssessmentsTab trainingId={trainingId} /></div> : null}
      {activeTab === "assignments" ? <div className="mt-6"><TrainingAssignmentsTab trainingId={trainingId} /></div> : null}
      {activeTab === "live" ? <div className="mt-6"><TrainingLiveTab trainingId={trainingId} /></div> : null}
    </div>
  );
}