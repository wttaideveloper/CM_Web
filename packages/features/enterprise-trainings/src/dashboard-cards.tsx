"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { TrainingParticipantDashboard, TrainingProviderDashboard } from "./trainings.service";
import { getTrainingContent, getTrainingProgress, listTrainingEnrolments } from "./trainings.service";

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusChipClass(status: string, expired: boolean): string {
  if (expired) return "rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-bold text-[#b42318]";
  const normalized = status.trim().toLowerCase();
  if (["approved", "enrolled", "attended", "active", "completed"].includes(normalized)) return "rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]";
  if (["pending", "waitlisted", "waitlist"].includes(normalized)) return "rounded-full bg-[#fff8e1] px-2 py-0.5 text-[10px] font-bold text-[#8a5a00]";
  if (["cancelled", "rejected", "no_show"].includes(normalized)) return "rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-bold text-[#b42318]";
  return "rounded-full bg-[#f0f3f2] px-2 py-0.5 text-[10px] font-bold text-[#52736a]";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#06201c]">{value}</p>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="text-sm text-[#52736a]">Overall progress</p>
        <p className="text-lg font-bold text-[#06201c]">{clamped}%</p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e8f0ed]">
        <div className="h-full rounded-full bg-[#1f6a58]" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function asProgressNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Shows an enrolled participant's lesson completion by training session. */
export function TrainingParticipantProgressCard({ trainingId }: { trainingId: string }) {
  const [participantEmail, setParticipantEmail] = useState("");
  const enrolmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "dashboard", "participant-enrolments"],
    queryFn: () => listTrainingEnrolments(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });
  const contentQuery = useQuery({
    queryKey: ["trainings", trainingId, "dashboard", "participant-content"],
    queryFn: () => getTrainingContent(trainingId, true),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });
  const normalizedEmail = participantEmail.trim().toLowerCase();
  const progressQuery = useQuery({
    queryKey: ["trainings", trainingId, "dashboard", "participant-progress", normalizedEmail],
    queryFn: () => getTrainingProgress(trainingId, normalizedEmail),
    enabled: Boolean(normalizedEmail),
    staleTime: 30_000,
  });
  const enrolledEmails = (enrolmentsQuery.data ?? [])
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      const email = typeof record.participant_email === "string" ? record.participant_email : typeof record.email === "string" ? record.email : "";
      return email.trim().toLowerCase();
    })
    .filter((email, index, emails) => email && emails.indexOf(email) === index);
  const content = contentQuery.data;
  const sections: Array<Record<string, unknown>> = Array.isArray(content)
    ? content.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).sections)
      ? ((content as Record<string, unknown>).sections as Array<Record<string, unknown>>)
      : [];
  const progress = progressQuery.data && typeof progressQuery.data === "object" ? progressQuery.data as Record<string, unknown> : {};
  const completedLessons = new Set<string>();
  if (Array.isArray(progress.completed_lessons)) {
    progress.completed_lessons.forEach((lessonId) => {
      if (typeof lessonId === "string") completedLessons.add(lessonId);
    });
  }
  if (Array.isArray(progress.lessons_detail)) {
    progress.lessons_detail.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const record = item as Record<string, unknown>;
      if (record.is_completed === true && typeof record.lesson_id === "string") completedLessons.add(record.lesson_id);
    });
  }
  const totalLessons = sections.reduce((count, section) => count + (Array.isArray(section.lessons) ? section.lessons.length : 0), 0);
  const completedCount = completedLessons.size;
  const progressPercent = asProgressNumber(progress.overall_percent) ?? (totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0);

  return (
    <div className="space-y-4 border-t border-[#edf3f0] pt-5">
      <div>
        <h3 className="mt-1 text-lg font-bold text-[#06201c]">View participant progress</h3>
      </div>
      <label className="block text-sm font-semibold text-[#06201c]">
        Participant
        <select value={participantEmail} onChange={(event) => setParticipantEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]">
          <option value="">Select an enrolled participant</option>
          {enrolledEmails.map((email) => <option key={email} value={email}>{email}</option>)}
        </select>
      </label>
      {!participantEmail ? <p className="text-sm text-[#52736a]">Select an enrolled participant to view lesson progress.</p> : null}
      {participantEmail && progressQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading participant progress...</p> : null}
      {participantEmail && progressQuery.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{(progressQuery.error as Error).message}</p> : null}
      {participantEmail && !progressQuery.isLoading && !progressQuery.isError ? (
        <>
          <ProgressBar percent={progressPercent} />
          <ul className="space-y-2">
            {sections.map((section, index) => {
              const lessons = Array.isArray(section.lessons) ? section.lessons.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
              const completedInSection = lessons.filter((lesson) => typeof lesson.id === "string" && completedLessons.has(lesson.id)).length;
              const title = typeof section.title === "string" && section.title.trim() ? section.title : `Session ${index + 1}`;
              return <li key={`${title}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3"><span className="text-sm font-semibold text-[#06201c]">{title}</span><span className="shrink-0 text-xs text-[#52736a]">{completedInSection}/{lessons.length} lessons completed</span></li>;
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function rowLabel(item: unknown, fallback: string): { label: string; sub: string } {
  const record = item as Record<string, unknown>;
  if (!item || typeof item !== "object") return { label: fallback, sub: "" };
  const name = typeof record.participant_name === "string" ? record.participant_name : typeof record.name === "string" ? record.name : "";
  const title = typeof record.title === "string" ? record.title : "";
  const type = typeof record.type === "string" ? record.type : "";
  const email = typeof record.participant_email === "string" ? record.participant_email : typeof record.email === "string" ? record.email : "";
  const status = typeof record.status === "string" && record.status ? humanize(record.status) : "";
  const label = name || title || type || (typeof record.id === "string" ? record.id : "") || fallback;
  const sub = [email, status].filter(Boolean).join(" • ");
  return { label, sub };
}

/** Renders the participant dashboard for a training or program. */
export function ParticipantDashboardCard({ dashboard, trainingId }: { dashboard: TrainingParticipantDashboard; trainingId: string }) {
  const [participantEmail, setParticipantEmail] = useState("");
  const [expandedProgressSession, setExpandedProgressSession] = useState<string | null>(null);
  const enrolmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "dashboard", "participant-enrolments"],
    queryFn: () => listTrainingEnrolments(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });
  const contentQuery = useQuery({
    queryKey: ["trainings", trainingId, "dashboard", "participant-content"],
    queryFn: () => getTrainingContent(trainingId, true),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });
  const enrolledEmails = (enrolmentsQuery.data ?? [])
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      const email = typeof record.participant_email === "string" ? record.participant_email : typeof record.email === "string" ? record.email : "";
      return email.trim().toLowerCase();
    })
    .filter((email, index, emails) => email && emails.indexOf(email) === index);
  useEffect(() => {
    if (!participantEmail && enrolledEmails.length > 0) setParticipantEmail(enrolledEmails[0]);
  }, [enrolledEmails, participantEmail]);
  const progressQuery = useQuery({
    queryKey: ["trainings", trainingId, "dashboard", "participant-progress", participantEmail],
    queryFn: () => getTrainingProgress(trainingId, participantEmail),
    enabled: Boolean(participantEmail),
    staleTime: 30_000,
  });
  const selectedProgress = progressQuery.data && typeof progressQuery.data === "object" ? progressQuery.data as Record<string, unknown> : null;
  const content = contentQuery.data;
  const sections: Array<Record<string, unknown>> = Array.isArray(content)
    ? content.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).sections)
      ? ((content as Record<string, unknown>).sections as Array<Record<string, unknown>>)
      : [];
  const completedLessons = new Set<string>();
  if (selectedProgress && Array.isArray(selectedProgress.completed_lessons)) {
    selectedProgress.completed_lessons.forEach((lessonId) => {
      if (typeof lessonId === "string") completedLessons.add(lessonId);
    });
  }
  if (selectedProgress && Array.isArray(selectedProgress.lessons_detail)) {
    selectedProgress.lessons_detail.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const record = item as Record<string, unknown>;
      if (record.is_completed === true && typeof record.lesson_id === "string") completedLessons.add(record.lesson_id);
    });
  }
  const totalLessons = sections.reduce((count, section) => count + (Array.isArray(section.lessons) ? section.lessons.length : 0), 0);
  const completedCount = completedLessons.size;
  const selectedPercent = selectedProgress ? asProgressNumber(selectedProgress.overall_percent) ?? (totalLessons > 0 ? completedCount / totalLessons * 100 : 0) : dashboard.overall_percent;
  const selectedSectionsDone = selectedProgress ? asProgressNumber(selectedProgress.sections_done) ?? sections.filter((section) => {
    const lessons = Array.isArray(section.lessons) ? section.lessons : [];
    return lessons.length > 0 && lessons.every((lesson) => lesson && typeof lesson === "object" && typeof (lesson as Record<string, unknown>).id === "string" && completedLessons.has((lesson as Record<string, unknown>).id as string));
  }).length : dashboard.sections_done;
  const selectedLessonsDone = selectedProgress ? asProgressNumber(selectedProgress.lessons_done) ?? completedCount : dashboard.lessons_done;
  const selectedStatus = selectedProgress && typeof selectedProgress.enrolment_status === "string" ? selectedProgress.enrolment_status : participantEmail ? "enrolled" : dashboard.enrolment_status;
  return (
    <section className="space-y-5 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Participant Dashboard</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusChipClass(selectedStatus, false)}>{humanize(selectedStatus)}</span>
          {dashboard.expired ? <span className="rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-bold text-[#b42318]">Expired</span> : null}
        </div>
      </div>
      <label className="block text-sm font-semibold text-[#06201c]">
        Participant
        <select value={participantEmail} onChange={(event) => setParticipantEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]">
          <option value="">Select an enrolled participant</option>
          {enrolledEmails.map((email) => <option key={email} value={email}>{email}</option>)}
        </select>
      </label>
      <ProgressBar percent={selectedPercent} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Sessions" value={`${selectedSectionsDone} / ${selectedProgress ? sections.length : dashboard.total_sections}`} />
        <Stat label="Lessons" value={`${selectedLessonsDone} / ${selectedProgress ? totalLessons : dashboard.total_lessons}`} />
        <Stat label="Certificate" value={dashboard.certificate_url ? "Ready" : "Pending"} />
      </div>
      {dashboard.certificate_url ? (
        <a href={dashboard.certificate_url} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-[#1f6a58] underline">View certificate →</a>
      ) : null}
      {participantEmail && progressQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading participant progress...</p> : null}
      {participantEmail && progressQuery.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{(progressQuery.error as Error).message}</p> : null}
      {participantEmail && !progressQuery.isLoading && !progressQuery.isError ? (
        <div>
          <h3 className="mt-1 text-lg font-bold text-[#06201c]">View participant progress</h3>
          <ul className="mt-3 space-y-2">
            {sections.map((section, index) => {
              const lessons = Array.isArray(section.lessons) ? section.lessons.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
              const completedInSection = lessons.filter((lesson) => typeof lesson.id === "string" && completedLessons.has(lesson.id)).length;
              const title = typeof section.title === "string" && section.title.trim() ? section.title : `Session ${index + 1}`;
              const sessionKey = `${title}-${index}`;
              const isExpanded = expandedProgressSession === sessionKey;
              return (
                <li key={sessionKey} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa]">
                  <button type="button" onClick={() => setExpandedProgressSession(isExpanded ? null : sessionKey)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#06201c]">{title}</span>
                      <span className="mt-1 block text-xs text-[#52736a]">{completedInSection}/{lessons.length} lessons completed</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[#1f6a58]" aria-hidden="true">{isExpanded ? "−" : "+"}</span>
                  </button>
                  {isExpanded ? (
                    <ul className="space-y-2 border-t border-[#e1ebe6] px-4 py-3">
                      {lessons.length === 0 ? <li className="text-xs text-[#7f9d94]">No lessons in this session.</li> : lessons.map((lesson, lessonIndex) => {
                        const lessonId = typeof lesson.id === "string" ? lesson.id : `${sessionKey}-${lessonIndex}`;
                        const lessonTitle = typeof lesson.title === "string" && lesson.title.trim() ? lesson.title : `Lesson ${lessonIndex + 1}`;
                        const isCompleted = typeof lesson.id === "string" && completedLessons.has(lesson.id);
                        return <li key={lessonId} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"><span className="text-sm text-[#06201c]">{lessonTitle}</span><span className={isCompleted ? "text-xs font-semibold text-[#1f6a58]" : "text-xs text-[#7f9d94]"}>{isCompleted ? "Completed" : "Not completed"}</span></li>;
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Renders the provider dashboard for a training or program. */
export function ProviderDashboardCard({ dashboard }: { dashboard: TrainingProviderDashboard }) {
  const entries = Object.entries(dashboard.by_status ?? {}).sort((a, b) => b[1] - a[1]);
  const enrolments = Array.isArray(dashboard.recent_enrolments) ? dashboard.recent_enrolments : [];
  return (
    <section className="space-y-5 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Provider Dashboard</p>
        <span className="rounded-full bg-[#f0f3f2] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">{dashboard.total_enrolments} enrolments</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total enrolments" value={String(dashboard.total_enrolments)} />
        <Stat label="Capacity used" value={`${dashboard.capacity_utilization}%`} />
        <Stat label="Statuses" value={String(entries.length)} />
        <Stat label="Recent entries" value={String(enrolments.length)} />
      </div>
      <ProgressBar percent={dashboard.capacity_utilization} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Enrolments by status</p>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-[#52736a]">No enrolments yet.</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {entries.map(([status, count]) => (
              <li key={status} className="flex items-center justify-between rounded-lg border border-[#e1ebe6] bg-[#f9fcfa] px-3 py-2">
                <span className="text-sm text-[#52736a]">{humanize(status)}</span>
                <span className="text-sm font-bold text-[#06201c]">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Recent enrolments</p>
        {enrolments.length === 0 ? (
          <p className="mt-2 text-sm text-[#52736a]">No recent enrolments yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {enrolments.map((item, index) => {
              const { label, sub } = rowLabel(item, `Enrolment ${index + 1}`);
              return <li key={index} className="rounded-lg bg-[#f9fcfa] px-3 py-2"><p className="text-sm text-[#06201c]">{label}</p>{sub ? <p className="text-xs text-[#7f9d94]">{sub}</p> : null}</li>;
            })}
          </ul>
        )}
      </div>
    </section>
  );
}