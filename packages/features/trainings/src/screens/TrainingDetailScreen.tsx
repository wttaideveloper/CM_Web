"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import ProgressSummaryCard from "./ProgressSummaryCard";
import TrainingActionsMenu from "./TrainingActionsMenu";
import { TrainingAssessmentsTab, TrainingAssignmentsTab, TrainingContentTab, TrainingEnrolmentsTab, TrainingLiveTab, TrainingSectionsTab } from "./TrainingDetailsSections";
import { displayValue, formatTrainingDate, formatTrainingPrice } from "./detail-formatters";
import { getTrainingStatusBadgeClass, getTrainingStatusLabel } from "./training-status";
import { getTrainingAdminNotes, getTrainingById, getTrainingProgress, getTrainingSections, listTrainingEnrolments } from "./trainings.service";

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
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{training.category || "TRAINING"}</p>
          <h2 className="mt-1 text-2xl font-bold text-[#06201c] sm:text-3xl">{training.title}</h2>
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${getTrainingStatusBadgeClass(training.status)}`}>{getTrainingStatusLabel(training.status)}</span>
        </div>
        {typeof training.primary_image === "string" && training.primary_image.trim().length > 0 ? (
          <div className="shrink-0 overflow-hidden rounded-2xl border border-[#e1ebe6] shadow-sm">
            <img alt={training.title} className="max-h-48 w-full object-cover" src={training.primary_image.trim()} onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>
        ) : null}
        <TrainingActionsMenu training={training} />
      </div>

      {(training.status === "rejected" || training.status === "needs_revision") ? <AdminNoteBanner trainingId={trainingId} status={training.status} /> : null}

      {typeof training.primary_image === "string" && training.primary_image.trim().length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-[#f4faf7] shadow-sm">
          <img alt={training.title} className="h-48 w-full object-cover sm:h-56" src={training.primary_image.trim()} onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </div>
      ) : null}

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