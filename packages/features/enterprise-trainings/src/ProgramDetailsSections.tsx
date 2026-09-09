"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProgramCheckInFeedback,
  assignProgramPhaseInstructors,
  createProgramActivity,
  createProgramCheckIn,
  createProgramPhase,
  createProgramSurvey,
  deleteProgramActivity,
  deleteProgramPhase,
  enrolInProgram,
  exportProgramEnrolments,
  getProgramAvailability,
  getProgramCertificate,
  getProgramContent,
  getProgramMeetingLink,
  getProgramParticipantDashboard,
  getProgramProviderDashboard,
  getProgramReports,
  getProgramsReportSummary,
  listProgramCheckIns,
  listProgramEnrolments,
  listProgramPhases,
  listProgramReviews,
  listProgramSurveys,
  listProgramWaitlist,
  ProgramsApiError,
  submitProgramSurvey,
  updateProgramEnrolmentStatus,
  updateProgramGoals,
  updateProgramPhase,
  type CreateProgramCheckInPayload,
  type CreateProgramPhasePayload,
} from "./programs.service";
import { formatProgramDate, humanizeLabel } from "./detail-formatters";

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[#06201c]">{title}</h3>
        {action ?? null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Renders the Program phases with activities and instructors. */
export function ProgramPhasesTab({ programId }: { programId: string }) {
  const queryClient = useQueryClient();
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [instructorEmails, setInstructorEmails] = useState("");

  const phasesQuery = useQuery({
    queryKey: ["programs", programId, "phases"],
    queryFn: () => listProgramPhases(programId),
    enabled: Boolean(programId),
  });

  const invalidatePhases = () => void queryClient.invalidateQueries({ queryKey: ["programs", programId, "phases"] });

  const createPhaseMutation = useMutation({
    mutationFn: () => {
      const payload: CreateProgramPhasePayload = { title: newPhaseTitle.trim() };
      return createProgramPhase(programId, payload);
    },
    onSuccess: () => { setNewPhaseTitle(""); setFeedback("Phase added."); void invalidatePhases(); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to add the phase."),
  });

  const deletePhaseMutation = useMutation({
    mutationFn: (phaseId: string) => deleteProgramPhase(programId, phaseId),
    onSuccess: () => { setFeedback("Phase deleted."); void invalidatePhases(); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to delete the phase."),
  });

  const createActivityMutation = useMutation({
    mutationFn: ({ phaseId, title }: { phaseId: string; title: string }) => createProgramActivity(programId, phaseId, { type: "activity", title }),
    onSuccess: () => { setNewActivityTitle(""); setFeedback("Activity added."); void invalidatePhases(); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to add activity."),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: ({ phaseId, activityId }: { phaseId: string; activityId: string }) => deleteProgramActivity(programId, phaseId, activityId),
    onSuccess: () => { setFeedback("Activity deleted."); void invalidatePhases(); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to delete activity."),
  });

  const assignInstructorsMutation = useMutation({
    mutationFn: ({ phaseId, emails }: { phaseId: string; emails: string }) => assignProgramPhaseInstructors(programId, phaseId, { instructor_emails: emails.split(",").map(e => e.trim()).filter(Boolean) }),
    onSuccess: () => { setInstructorEmails(""); setFeedback("Instructors assigned."); void invalidatePhases(); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to assign instructors."),
  });

  if (phasesQuery.isLoading) return <p className="text-sm text-[#52736a]">Loading phases...</p>;
  if (phasesQuery.isError) return <p className="text-sm font-semibold text-[#b42318]">{(phasesQuery.error as Error).message}</p>;

  const phases = Array.isArray(phasesQuery.data) ? (phasesQuery.data as Array<Record<string, unknown>>) : [];

  return (
    <SectionCard title="Phases">
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {phases.length === 0 ? <p className="text-sm text-[#52736a]">No phases yet. Add your first phase to structure the program.</p> : null}
      <ul className="grid gap-3">
        {phases.map((phase, index) => {
          const id = typeof phase.id === "string" ? phase.id : String(index);
          const title = typeof phase.title === "string" ? phase.title : "Untitled phase";
          const phaseType = typeof phase.phase_type === "string" ? phase.phase_type : typeof phase.type === "string" ? phase.type : null;
          const activities = Array.isArray(phase.activities) ? phase.activities : [];
          const instructors = Array.isArray(phase.instructors) ? phase.instructors : [];
          const isExpanded = expandedPhase === id;
          return (
            <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setExpandedPhase(isExpanded ? null : id)} className="flex-1 text-left">
                  <p className="text-sm font-bold text-[#06201c]">{title}</p>
                  <p className="mt-0.5 text-xs text-[#52736a]">{phaseType ? `${humanizeLabel(phaseType)} · ` : ""}{activities.length > 0 ? `${activities.length} activit${activities.length === 1 ? "y" : "ies"}` : "Expand to add activities"}</p>
                </button>
                <button type="button" onClick={() => { if (window.confirm("Delete this phase?")) void deletePhaseMutation.mutate(id); }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5]">Delete</button>
              </div>
              {isExpanded ? (
                <div className="mt-3 border-t border-[#e1ebe6] pt-3 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Activities</p>
                  {activities.length === 0 ? <p className="text-xs text-[#7f9d94]">No activities yet.</p> : null}
                  <ul className="space-y-1">
                    {activities.map((act, aIdx) => {
                      const actRecord = act as Record<string, unknown>;
                      const actId = typeof actRecord.id === "string" ? actRecord.id : String(aIdx);
                      const actTitle = typeof actRecord.title === "string" ? actRecord.title : "Untitled activity";
                      return (
                        <li key={actId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                          <span className="text-[#06201c]">{actTitle}</span>
                          <button type="button" onClick={() => void deleteActivityMutation.mutate({ phaseId: id, activityId: actId })} className="text-xs font-semibold text-[#b42318]">Delete</button>
                        </li>
                      );
                    })}
                  </ul>
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newActivityTitle.trim()) void createActivityMutation.mutate({ phaseId: id, title: newActivityTitle.trim() }); }}>
                    <input value={newActivityTitle} onChange={(e) => setNewActivityTitle(e.target.value)} placeholder="New activity title" className="h-8 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    <button type="submit" disabled={createActivityMutation.isPending || !newActivityTitle.trim()} className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white disabled:opacity-60">Add</button>
                  </form>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Instructors</p>
                  {instructors.length > 0 ? <p className="text-xs text-[#52736a]">{instructors.map((i: unknown) => typeof i === "string" ? i : (i as Record<string, unknown>).email || String(i)).join(", ")}</p> : <p className="text-xs text-[#7f9d94]">No instructors assigned.</p>}
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (instructorEmails.trim()) void assignInstructorsMutation.mutate({ phaseId: id, emails: instructorEmails }); }}>
                    <input value={instructorEmails} onChange={(e) => setInstructorEmails(e.target.value)} placeholder="email1, email2" className="h-8 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    <button type="submit" disabled={assignInstructorsMutation.isPending || !instructorEmails.trim()} className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white disabled:opacity-60">Assign</button>
                  </form>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (newPhaseTitle.trim()) void createPhaseMutation.mutate();
        }}
      >
        <input value={newPhaseTitle} onChange={(event) => setNewPhaseTitle(event.target.value)} placeholder="New phase title" className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={createPhaseMutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createPhaseMutation.isPending ? "Adding..." : "Add phase"}</button>
      </form>
    </SectionCard>
  );
}

/** Renders the Program enrolments with enrol + status actions. */
export function ProgramEnrolmentsTab({ programId }: { programId: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [enrolName, setEnrolName] = useState("");
  const [enrolEmail, setEnrolEmail] = useState("");

  const enrolmentsQuery = useQuery({
    queryKey: ["programs", programId, "enrolments"],
    queryFn: () => listProgramEnrolments(programId),
    enabled: Boolean(programId),
  });

  const enrolMutation = useMutation({
    mutationFn: () => enrolInProgram(programId, { participant_name: enrolName.trim(), participant_email: enrolEmail.trim() }),
    onSuccess: () => { setEnrolName(""); setEnrolEmail(""); setFeedback("Enrolment submitted."); void queryClient.invalidateQueries({ queryKey: ["programs", programId, "enrolments"] }); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to enrol participant."),
  });

  const updateEnrolmentStatusMutation = useMutation({
    mutationFn: ({ enrolId, status }: { enrolId: string; status: string }) => updateProgramEnrolmentStatus(programId, enrolId, { status }),
    onSuccess: () => { setFeedback("Enrolment updated."); void queryClient.invalidateQueries({ queryKey: ["programs", programId, "enrolments"] }); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to update the enrolment."),
  });

  const enrolments = enrolmentsQuery.data ?? [];

  return (
    <SectionCard title="Enrolments">
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (enrolName.trim() && enrolEmail.trim()) enrolMutation.mutate(); }}>
        <input value={enrolName} onChange={(e) => setEnrolName(e.target.value)} placeholder="Participant name" className="h-10 flex-1 min-w-[140px] rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <input value={enrolEmail} onChange={(e) => setEnrolEmail(e.target.value)} placeholder="Participant email" type="email" className="h-10 flex-1 min-w-[180px] rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={enrolMutation.isPending || !enrolName.trim() || !enrolEmail.trim()} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{enrolMutation.isPending ? "Enrolling..." : "Enrol User"}</button>
      </form>
      {enrolmentsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading enrolments...</p> : null}
      {enrolmentsQuery.isError ? <p className="text-sm font-semibold text-[#b42318]">{(enrolmentsQuery.error as Error).message}</p> : null}
      {!enrolmentsQuery.isLoading && !enrolmentsQuery.isError && enrolments.length === 0 ? <p className="text-sm text-[#52736a]">No enrolments yet.</p> : null}
      {enrolments.length > 0 ? (
        <ul className="grid gap-2">
          {enrolments.map((enrolment, index) => {
            const record = enrolment as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : String(index);
            const name = typeof record.participant_name === "string" ? record.participant_name : typeof record.name === "string" ? record.name : "Participant";
            const email = typeof record.participant_email === "string" ? record.participant_email : null;
            const status = typeof record.status === "string" ? record.status : "—";
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[#06201c]">{name}</p>
                  {email ? <p className="mt-0.5 text-xs text-[#52736a]">{email}</p> : null}
                  <span className="mt-1 inline-block rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-[11px] font-bold text-[#2563eb]">{humanizeLabel(status)}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void updateEnrolmentStatusMutation.mutate({ enrolId: id, status: "completed" })} className="rounded-full border border-[#d7e5df] px-3 py-1 text-xs font-semibold text-[#1f6a58]">Complete</button>
                  <button type="button" onClick={() => void updateEnrolmentStatusMutation.mutate({ enrolId: id, status: "withdrawn" })} className="rounded-full border border-[#f3d5d1] px-3 py-1 text-xs font-semibold text-[#b42318]">Withdraw</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}

/** Renders the Program check-ins with an add action. */
export function ProgramCheckInsTab({ programId }: { programId: string }) {
  const queryClient = useQueryClient();
  const [newCheckInEmail, setNewCheckInEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const checkInsQuery = useQuery({
    queryKey: ["programs", programId, "check-ins"],
    queryFn: () => listProgramCheckIns(programId),
    enabled: Boolean(programId),
  });

  const createCheckInMutation = useMutation({
    mutationFn: () => {
      const payload: CreateProgramCheckInPayload = { participant_email: newCheckInEmail.trim() };
      return createProgramCheckIn(programId, payload);
    },
    onSuccess: () => {
      setNewCheckInEmail("");
      setFeedback("Check-in recorded.");
      void queryClient.invalidateQueries({ queryKey: ["programs", programId, "check-ins"] });
    },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to record the check-in."),
  });

  const checkIns = checkInsQuery.data ?? [];

  return (
    <SectionCard title="Check-ins">
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {checkInsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading check-ins...</p> : null}
      {checkInsQuery.isError ? <p className="text-sm font-semibold text-[#b42318]">{(checkInsQuery.error as Error).message}</p> : null}
      {!checkInsQuery.isLoading && !checkInsQuery.isError && checkIns.length === 0 ? <p className="text-sm text-[#52736a]">No check-ins yet.</p> : null}
      {checkIns.length > 0 ? (
        <ul className="grid gap-2">
          {checkIns.map((checkIn, index) => {
            const record = checkIn as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : String(index);
            const email = typeof record.participant_email === "string" ? record.participant_email : "Participant";
            const createdAt = typeof record.created_at === "string" ? record.created_at : null;
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                <p className="text-sm font-bold text-[#06201c]">{email}</p>
                {createdAt ? <span className="text-xs text-[#52736a]">{formatProgramDate(createdAt)}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (newCheckInEmail.trim()) void createCheckInMutation.mutate();
        }}
      >
        <input type="email" value={newCheckInEmail} onChange={(event) => setNewCheckInEmail(event.target.value)} placeholder="Participant email" className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={createCheckInMutation.isPending || !newCheckInEmail.trim()} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createCheckInMutation.isPending ? "Recording..." : "Check in"}</button>
      </form>
    </SectionCard>
  );
}

/** Renders the Program reviews and waitlist. */
export function ProgramReviewsAndWaitlistTab({ programId }: { programId: string }) {
  const reviewsQuery = useQuery({
    queryKey: ["programs", programId, "reviews"],
    queryFn: () => listProgramReviews(programId),
    enabled: Boolean(programId),
  });
  const waitlistQuery = useQuery({
    queryKey: ["programs", programId, "waitlist"],
    queryFn: () => listProgramWaitlist(programId),
    enabled: Boolean(programId),
  });

  const reviews = reviewsQuery.data ?? [];
  const waitlist = waitlistQuery.data ?? [];

  return (
    <div className="grid gap-5">
      <SectionCard title="Reviews">
        {reviewsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading reviews...</p> : null}
        {reviewsQuery.isError ? <p className="text-sm font-semibold text-[#b42318]">{(reviewsQuery.error as Error).message}</p> : null}
        {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? <p className="text-sm text-[#52736a]">No reviews yet.</p> : null}
        {reviews.length > 0 ? (
          <ul className="grid gap-2">
            {reviews.map((review, index) => {
              const record = review as Record<string, unknown>;
              const id = typeof record.id === "string" ? record.id : String(index);
              const rating = typeof record.rating === "number" ? record.rating : "—";
              const comment = typeof record.comment === "string" ? record.comment : null;
              const email = typeof record.participant_email === "string" ? record.participant_email : null;
              return (
                <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                  <p className="text-sm font-bold text-[#06201c]">{String(rating)} / 5{email ? ` · ${email}` : ""}</p>
                  {comment ? <p className="mt-1 text-sm text-[#52736a]">{comment}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </SectionCard>
      <SectionCard title="Waitlist">
        {waitlistQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading waitlist...</p> : null}
        {waitlistQuery.isError ? <p className="text-sm font-semibold text-[#b42318]">{(waitlistQuery.error as Error).message}</p> : null}
        {!waitlistQuery.isLoading && !waitlistQuery.isError && waitlist.length === 0 ? <p className="text-sm text-[#52736a]">Waitlist is empty.</p> : null}
        {waitlist.length > 0 ? (
          <ul className="grid gap-2">
            {waitlist.map((entry, index) => {
              const record = entry as Record<string, unknown>;
              const id = typeof record.id === "string" ? record.id : String(index);
              const email = typeof record.participant_email === "string" ? record.participant_email : typeof record.email === "string" ? record.email : "Participant";
              return (
                <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3 text-sm text-[#52736a]">{email}</li>
              );
            })}
          </ul>
        ) : null}
      </SectionCard>
    </div>
  );
}

/** Content tab — learner view of program content. */
export function ProgramContentTab({ programId }: { programId: string }) {
  const contentQuery = useQuery({
    queryKey: ["programs", programId, "content"],
    queryFn: () => getProgramContent(programId),
    enabled: Boolean(programId),
    retry: false,
  });

  if (contentQuery.isLoading) return <SectionCard title="Content"><p className="text-sm text-[#52736a]">Loading content...</p></SectionCard>;

  const content = contentQuery.data;
  const sections = content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).sections)
    ? (content as Record<string, unknown>).sections as Array<Record<string, unknown>>
    : Array.isArray(content) ? content as Array<Record<string, unknown>> : [];

  const isAccessError = contentQuery.isError && ((contentQuery.error as Error).message?.includes("403") || (contentQuery.error as Error).message?.includes("422"));

  return (
    <SectionCard title="Program Content">
      {isAccessError ? <p className="text-sm text-[#52736a]">Content is available for published programs. Publish this program to see content here.</p> : null}
      {!isAccessError && sections.length === 0 ? <p className="text-sm text-[#52736a]">No content available yet.</p> : null}
      <ul className="space-y-3">
        {sections.map((section, sIdx) => {
          const sId = typeof section.id === "string" ? section.id : String(sIdx);
          const sTitle = typeof section.title === "string" ? section.title : `Section ${sIdx + 1}`;
          const lessons = Array.isArray(section.lessons) ? section.lessons : [];
          return (
            <li key={sId} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
              <p className="text-sm font-bold text-[#06201c]">{sTitle}</p>
              <ul className="mt-2 space-y-1 pl-4">
                {lessons.map((lesson, lIdx) => {
                  const lRecord = lesson as Record<string, unknown>;
                  const lTitle = typeof lRecord.title === "string" ? lRecord.title : `Lesson ${lIdx + 1}`;
                  return <li key={lIdx} className="text-xs text-[#52736a]">• {lTitle}</li>;
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/** Surveys tab — create and list surveys. */
export function ProgramSurveysTab({ programId }: { programId: string }) {
  const queryClient = useQueryClient();
  const [newSurveyTitle, setNewSurveyTitle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const surveysQuery = useQuery({
    queryKey: ["programs", programId, "surveys"],
    queryFn: () => listProgramSurveys(programId),
    enabled: Boolean(programId),
  });

  const createSurveyMutation = useMutation({
    mutationFn: () => createProgramSurvey(programId, { title: newSurveyTitle.trim(), questions: [] }),
    onSuccess: () => { setNewSurveyTitle(""); setFeedback("Survey created."); void queryClient.invalidateQueries({ queryKey: ["programs", programId, "surveys"] }); },
    onError: (error) => setFeedback(error instanceof ProgramsApiError ? error.message : "Unable to create survey."),
  });

  const surveys = surveysQuery.data ?? [];

  return (
    <SectionCard title="Surveys">
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newSurveyTitle.trim()) createSurveyMutation.mutate(); }}>
        <input value={newSurveyTitle} onChange={(e) => setNewSurveyTitle(e.target.value)} placeholder="Survey title" className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={createSurveyMutation.isPending || !newSurveyTitle.trim()} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createSurveyMutation.isPending ? "Creating..." : "Create"}</button>
      </form>
      {surveysQuery.isLoading ? <p className="mt-4 text-sm text-[#52736a]">Loading surveys...</p> : null}
      {!surveysQuery.isLoading && surveys.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No surveys yet.</p> : null}
      {surveys.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {surveys.map((survey, index) => {
            const record = survey as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : String(index);
            const title = typeof record.title === "string" ? record.title : "Untitled survey";
            const createdAt = typeof record.created_at === "string" ? record.created_at : null;
            return (
              <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[#06201c]">{title}</p>
                  {createdAt ? <p className="text-xs text-[#7f9d94]">{formatProgramDate(createdAt)}</p> : null}
                </div>
                <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-bold text-[#2563eb]">Survey</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}

/** Dashboards tab — participant and provider dashboards. */
export function ProgramDashboardsTab({ programId }: { programId: string }) {
  const participantQuery = useQuery({
    queryKey: ["programs", programId, "dashboard", "participant"],
    queryFn: () => getProgramParticipantDashboard(programId),
    enabled: Boolean(programId),
    retry: false,
  });
  const providerQuery = useQuery({
    queryKey: ["programs", programId, "dashboard", "provider"],
    queryFn: () => getProgramProviderDashboard(programId),
    enabled: Boolean(programId),
    retry: false,
  });

  return (
    <div className="grid gap-5">
      <SectionCard title="Participant Dashboard">
        {participantQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
        {participantQuery.isError ? <p className="text-sm text-[#52736a]">Dashboard data will be available once the program has active participants.</p> : null}
        {participantQuery.data ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[#52736a]">{JSON.stringify(participantQuery.data, null, 2)}</pre>
        ) : null}
      </SectionCard>
      <SectionCard title="Provider Dashboard">
        {providerQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
        {providerQuery.isError ? <p className="text-sm text-[#52736a]">Dashboard data will be available once the program has active participants.</p> : null}
        {providerQuery.data ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[#52736a]">{JSON.stringify(providerQuery.data, null, 2)}</pre>
        ) : null}
      </SectionCard>
    </div>
  );
}

/** Reports tab — program reports + summary + export. */
export function ProgramReportsTab({ programId }: { programId: string }) {
  const reportsQuery = useQuery({
    queryKey: ["programs", programId, "reports"],
    queryFn: () => getProgramReports(programId),
    enabled: Boolean(programId),
    retry: false,
  });
  const summaryQuery = useQuery({
    queryKey: ["programs", "reports", "summary"],
    queryFn: () => getProgramsReportSummary(),
    enabled: true,
    retry: false,
  });

  return (
    <div className="grid gap-5">
      <SectionCard title="Program Reports">
        {reportsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
        {reportsQuery.isError ? <p className="text-sm text-[#52736a]">Reports will be available once the program has active participants and enrolments.</p> : null}
        {reportsQuery.data ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[#52736a]">{JSON.stringify(reportsQuery.data, null, 2)}</pre>
        ) : null}
      </SectionCard>
      <SectionCard title="Report Summary">
        {summaryQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
        {summaryQuery.isError ? <p className="text-sm text-[#52736a]">Report summary will be available once there is programme data.</p> : null}
        {summaryQuery.data ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[#52736a]">{JSON.stringify(summaryQuery.data, null, 2)}</pre>
        ) : null}
      </SectionCard>
    </div>
  );
}

/** Details sidebar — certificate, goals, availability, meeting-link. */
export function ProgramDetailsSidebar({ programId }: { programId: string }) {
  const availabilityQuery = useQuery({
    queryKey: ["programs", programId, "availability"],
    queryFn: () => getProgramAvailability(programId),
    enabled: Boolean(programId),
    retry: false,
  });
  const meetingLinkQuery = useQuery({
    queryKey: ["programs", programId, "meeting-link"],
    queryFn: () => getProgramMeetingLink(programId),
    enabled: Boolean(programId),
    retry: false,
  });

  return (
    <div className="space-y-5">
      {availabilityQuery.data ? (
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Availability</p>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-[#52736a]">{JSON.stringify(availabilityQuery.data, null, 2)}</pre>
        </section>
      ) : null}
      {meetingLinkQuery.data ? (
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Meeting Link</p>
          <p className="mt-2 text-sm text-[#52736a]">{typeof meetingLinkQuery.data === "string" ? meetingLinkQuery.data : JSON.stringify(meetingLinkQuery.data)}</p>
        </section>
      ) : null}
    </div>
  );
}