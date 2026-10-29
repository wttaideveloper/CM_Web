"use client";

import { humanizeLabel } from "./detail-formatters";
import type { TrainingLessonAttendanceSession } from "./training-lesson-attendance.utils";

interface TrainingSessionLessonPickerProps {
  sessions: readonly TrainingLessonAttendanceSession[];
  selectedSession: TrainingLessonAttendanceSession | null;
  selectedLessonId: string;
  disabled: boolean;
  onSessionChange: (sessionId: string) => void;
  onLessonSelect: (lessonId: string) => void;
}

/** Lets an admin choose a session and then one of its lessons for attendance management. */
export default function TrainingSessionLessonPicker({
  sessions,
  selectedSession,
  selectedLessonId,
  disabled,
  onSessionChange,
  onLessonSelect,
}: TrainingSessionLessonPickerProps) {
  return (
    <>
      <label className="mt-5 block">
        <span className="mb-1 block text-sm font-semibold text-[#31594d]">Select session</span>
        <select
          value={selectedSession?.id ?? ""}
          disabled={disabled}
          onChange={(event) => onSessionChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
        >
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              Session {session.number}: {session.title}
            </option>
          ))}
        </select>
      </label>

      {selectedSession ? (
        <section className="mt-5">
          <h4 className="font-bold text-[#06201c]">
            Session {selectedSession.number}: {selectedSession.title}
          </h4>
          <ul className="mt-3 grid gap-2">
            {selectedSession.lessons.map((lesson) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => onLessonSelect(lesson.id)}
                  disabled={disabled}
                  aria-pressed={selectedLessonId === lesson.id}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${selectedLessonId === lesson.id ? "border-[#1f6a58] bg-[#e8f6ee]" : "border-[#e1ebe6] bg-[#f9fcfa] hover:border-[#b7d5c8]"} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="block text-sm font-semibold text-[#06201c]">
                    Lesson {selectedSession.number}.{lesson.number}: {lesson.title}
                  </span>
                  <span className="mt-1 block text-xs text-[#52736a]">{humanizeLabel(lesson.type)}</span>
                </button>
              </li>
            ))}
          </ul>
          {!selectedLessonId || !selectedSession.lessons.some((lesson) => lesson.id === selectedLessonId) ? (
            <p className="mt-4 rounded-xl border border-dashed border-[#d7e5df] px-4 py-5 text-center text-sm text-[#52736a]">
              Select a lesson to view and manage its attendance.
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
