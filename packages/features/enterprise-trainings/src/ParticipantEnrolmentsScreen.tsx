"use client";

import { useQuery } from "@tanstack/react-query";
import { listMyTrainingEnrolments } from "./trainings.service";
import { formatTrainingDate, humanizeLabel } from "./detail-formatters";
import { getTrainingStatusBadgeClass, getTrainingStatusLabel, type TrainingStatus } from "./training-status";

function getStringField(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getNumericField(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function formatDate(value: string | null): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return formatTrainingDate(value);
}

/** Participant dashboard — shows enrolled/active/completed/cancelled trainings. */
export function ParticipantEnrolmentsScreen() {
  const enrolmentsQuery = useQuery({
    queryKey: ["trainings", "my-enrolments"],
    queryFn: () => listMyTrainingEnrolments(),
    staleTime: 30_000,
  });

  const enrolments = Array.isArray(enrolmentsQuery.data) ? enrolmentsQuery.data : [];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#06201c]">My Enrolments</h1>
        <p className="mt-1 text-sm text-[#52736a]">Your enrolled, active, completed, and cancelled trainings.</p>
      </div>

      {enrolmentsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading enrolments...</p> : null}
      {enrolmentsQuery.isError ? <p className="text-sm font-semibold text-[#b42318]">{(enrolmentsQuery.error as Error).message}</p> : null}
      {!enrolmentsQuery.isLoading && !enrolmentsQuery.isError && enrolments.length === 0 ? (
        <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">No enrolments yet</p>
          <p className="mt-2 text-sm text-[#52736a]">Browse trainings and enrol to get started.</p>
        </div>
      ) : null}

      <ul className="grid gap-3">
        {enrolments.map((raw, index) => {
          const record = raw as Record<string, unknown>;
          const id = getStringField(record, "id", "enrolment_id", "enrollment_id") ?? String(index);
          const trainingTitle = getStringField(record, "training_title", "training_name", "title", "name") ?? "Training";
          const trainingId = getStringField(record, "training_id", "course_id");
          const status = getStringField(record, "status", "enrolment_status", "enrollment_status") ?? "unknown";
          const category = getStringField(record, "category", "training_category");
          const deliveryMode = getStringField(record, "delivery_mode", "training_delivery_mode");
          const startDate = formatDate(getStringField(record, "start_date", "training_start_date"));
          const endDate = formatDate(getStringField(record, "end_date", "training_end_date"));
          const enrolledAt = formatDate(getStringField(record, "enrolled_at", "enrollment_date", "created_at"));
          const completedAt = formatDate(getStringField(record, "completed_at", "completion_date"));
          const progress = getNumericField(record, "progress", "progress_percent", "completion_percentage");
          const attendanceStatus = getStringField(record, "attendance_status", "attendance");
          const certificateUrl = getStringField(record, "certificate_url");
          const normalizedStatus = status.toLowerCase().replace(/[-\s]+/g, "_");

          return (
            <li key={id} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#06201c]">{trainingTitle}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getTrainingStatusBadgeClass(normalizedStatus as TrainingStatus)}`}>
                      {getTrainingStatusLabel(normalizedStatus as TrainingStatus)}
                    </span>
                    <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                      {humanizeLabel(normalizedStatus)}
                    </span>
                  </div>
                  {category || deliveryMode ? <p className="mt-2 text-xs text-[#52736a]">{[category, deliveryMode ? humanizeLabel(deliveryMode) : null].filter(Boolean).join(" · ")}</p> : null}
                  {startDate || endDate ? <p className="mt-1 text-xs text-[#52736a]">Training dates: {[startDate, endDate].filter(Boolean).join(" – ")}</p> : null}
                  {enrolledAt ? <p className="mt-1 text-xs text-[#7f9d94]">Enrolled: {enrolledAt}</p> : null}
                  {completedAt ? <p className="mt-1 text-xs text-[#167550]">Completed: {completedAt}</p> : null}
                  {attendanceStatus ? <p className="mt-1 text-xs text-[#52736a]">Attendance: {humanizeLabel(attendanceStatus)}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  {progress !== null ? (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Progress</p>
                      <p className="text-sm font-bold text-[#1f6a58]">{progress}%</p>
                    </div>
                  ) : null}
                  {trainingId ? (
                    <div className="flex items-center gap-2">
                      {certificateUrl ? <a href={certificateUrl} target="_blank" rel="noreferrer" className="h-8 rounded-full border border-[#1f6a58] px-4 py-2 text-xs font-bold text-[#1f6a58]">Certificate</a> : null}
                      <a href={`/admin/trainings/${trainingId}`} className="h-8 rounded-full bg-[#1f6a58] px-4 py-2 text-xs font-bold text-white">View</a>
                    </div>
                  ) : null}
                </div>
              </div>
              {progress !== null ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e1ebe6]">
                  <div className="h-full rounded-full bg-[#1f6a58] transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
