"use client";

import { useQuery } from "@tanstack/react-query";
import { listMyTrainingEnrolments } from "./trainings.service";
import { formatTrainingDate, humanizeLabel } from "./detail-formatters";
import { getTrainingStatusBadgeClass, getTrainingStatusLabel, type TrainingStatus } from "./training-status";

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
          const id = typeof record.id === "string" ? record.id : String(index);
          const trainingTitle = typeof record.training_title === "string" ? record.training_title : typeof record.title === "string" ? record.title : "Training";
          const trainingId = typeof record.training_id === "string" ? record.training_id : null;
          const status = typeof record.status === "string" ? record.status : "unknown";
          const enrolledAt = typeof record.enrolled_at === "string" ? record.enrolled_at : typeof record.created_at === "string" ? record.created_at : null;
          const completedAt = typeof record.completed_at === "string" ? record.completed_at : null;
          const progress = typeof record.progress === "number" ? record.progress : null;

          return (
            <li key={id} className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#06201c]">{trainingTitle}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getTrainingStatusBadgeClass(status as TrainingStatus)}`}>
                      {getTrainingStatusLabel(status as TrainingStatus)}
                    </span>
                    <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                      {humanizeLabel(status)}
                    </span>
                  </div>
                  {enrolledAt ? <p className="mt-1 text-xs text-[#7f9d94]">Enrolled: {formatTrainingDate(enrolledAt)}</p> : null}
                  {completedAt ? <p className="mt-1 text-xs text-[#167550]">Completed: {formatTrainingDate(completedAt)}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  {progress !== null ? (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Progress</p>
                      <p className="text-sm font-bold text-[#1f6a58]">{progress}%</p>
                    </div>
                  ) : null}
                  {trainingId ? (
                    <a href={`/admin/trainings/${trainingId}`} className="h-8 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white">
                      View
                    </a>
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
