"use client";

import { formatDetailDateTime } from "./detail-formatters";
import type { LessonAttendanceParticipant, LessonAttendanceStatus } from "./trainings.service";

interface TrainingLessonAttendanceRosterProps {
  participants: readonly LessonAttendanceParticipant[];
  statuses: Readonly<Record<string, LessonAttendanceStatus>>;
  disabled: boolean;
  onStatusChange: (enrolmentId: string, status: LessonAttendanceStatus) => void;
}

/** Displays a lesson's enrolled participants, saved audit metadata, and editable attendance statuses. */
export default function TrainingLessonAttendanceRoster({
  participants,
  statuses,
  disabled,
  onStatusChange,
}: TrainingLessonAttendanceRosterProps) {
  return (
    <ul className="mt-5 divide-y divide-[#e1ebe6] rounded-lg border border-[#e1ebe6] bg-white">
      {participants.map((participant) => {
        const status = statuses[participant.enrolment_id] ?? participant.status;
        const markedBy = participant.marked_by?.name ?? participant.marked_by?.email;
        return (
          <li key={participant.enrolment_id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#06201c]">{participant.participant_name}</p>
              <p className="truncate text-xs text-[#7f9d94]">{participant.participant_email}</p>
              <p className="mt-1 text-[11px] text-[#7f9d94]">
                {markedBy ? `Last marked by ${markedBy}` : "Not previously marked"}
                {participant.marked_at ? ` · ${formatDetailDateTime(participant.marked_at)}` : ""}
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#31594d]">
              <span>Attendance</span>
              <select
                value={status}
                onChange={(event) => onStatusChange(participant.enrolment_id, event.target.value as LessonAttendanceStatus)}
                disabled={disabled}
                className="h-9 rounded-lg border border-[#d7e5df] bg-white px-2 text-xs text-[#06201c] outline-none focus:border-[#1f6a58] disabled:opacity-60"
                aria-label={`Attendance for ${participant.participant_name}`}
              >
                <option value="attended">Attended</option>
                <option value="absent">Absent</option>
                <option value="not_marked">Not marked</option>
              </select>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
