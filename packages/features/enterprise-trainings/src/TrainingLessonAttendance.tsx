"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { humanizeLabel } from "./detail-formatters";
import { getTrainingLessonAttendanceSessions } from "./training-lesson-attendance.utils";
import { getTrainingSections, getLessonAttendanceRoster, saveLessonAttendanceRoster, scanLessonAttendanceQr, TrainingsApiError, type LessonAttendanceRosterResponse, type LessonAttendanceStatus } from "./trainings.service";
import { QrScanner } from "./TrainingAttendanceSection";
import TrainingLessonAttendanceRoster from "./TrainingLessonAttendanceRoster";
import TrainingLessonQrCheckIn from "./TrainingLessonQrCheckIn";
import TrainingSessionLessonPicker from "./TrainingSessionLessonPicker";

interface TrainingLessonAttendanceProps {
  trainingId: string;
}

interface AttendanceFeedback {
  message: string;
  isError: boolean;
}

/** Renders saved attendance management and lesson-specific QR check-in for every lesson type. */
export default function TrainingLessonAttendance({ trainingId }: TrainingLessonAttendanceProps) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<Record<string, LessonAttendanceStatus>>({});
  const [qrCode, setQrCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<AttendanceFeedback | null>(null);
  const scannerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const sectionsQuery = useQuery({
    queryKey: ["trainings", trainingId, "sections"],
    queryFn: () => getTrainingSections(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
    retry: 1,
  });
  const sessions = useMemo(
    () => getTrainingLessonAttendanceSessions(sectionsQuery.data ?? []),
    [sectionsQuery.data],
  );

  useEffect(() => {
    if (!sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(sessions[0]?.id ?? "");
      setSelectedLessonId("");
    }
  }, [sessions, selectedSessionId]);

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const selectedLesson = selectedSession?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const rosterQuery = useQuery({
    queryKey: ["trainings", trainingId, "lesson-attendance", selectedLessonId],
    queryFn: () => getLessonAttendanceRoster(trainingId, selectedLessonId),
    enabled: Boolean(trainingId && selectedLesson),
    staleTime: 15_000,
    retry: 1,
  });

  useEffect(() => {
    if (!rosterQuery.data) return;
    setDraftStatuses(Object.fromEntries(
      rosterQuery.data.participants.map((participant) => [participant.enrolment_id, participant.status]),
    ));
  }, [rosterQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ lessonId, records }: { lessonId: string; records: Array<{ enrolment_id: string; status: LessonAttendanceStatus }> }) =>
      saveLessonAttendanceRoster(trainingId, lessonId, { records }),
    onSuccess: async () => {
      setFeedback({ message: "Lesson attendance saved.", isError: false });
      await queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "lesson-attendance", selectedLessonId] });
    },
    onError: (error) => setFeedback({
      message: error instanceof TrainingsApiError ? error.message : "Unable to save lesson attendance. Please try again.",
      isError: true,
    }),
  });

  const scanMutation = useMutation({
    mutationFn: ({ lessonId, code }: { lessonId: string; code: string }) =>
      scanLessonAttendanceQr(trainingId, lessonId, { qr_code: code }),
    onSuccess: async (result, variables) => {
      setQrCode("");
      setFeedback({
        message: result.message || (result.result === "already_attended"
          ? `${result.participant_name} is already marked attended for this lesson.`
          : `${result.participant_name} marked attended for this lesson.`),
        isError: false,
      });
      const rosterKey = ["trainings", trainingId, "lesson-attendance", variables.lessonId] as const;
      queryClient.setQueryData<LessonAttendanceRosterResponse>(rosterKey, (roster) => roster ? ({
        ...roster,
        participants: roster.participants.map((participant) => participant.enrolment_id === result.enrolment_id
          ? {
              ...participant,
              status: result.status,
              ...(result.marked_by !== undefined ? { marked_by: result.marked_by } : {}),
              ...(result.marked_at !== undefined ? { marked_at: result.marked_at } : {}),
            }
          : participant),
      }) : roster);
      await queryClient.invalidateQueries({ queryKey: rosterKey });
    },
    onError: (error) => setFeedback({
      message: error instanceof TrainingsApiError ? error.message : "Unable to check in this QR code for the lesson. Please try again.",
      isError: true,
    }),
  });

  const participants = rosterQuery.data?.participants ?? [];
  const changedRecords = participants.flatMap((participant) => {
    const status = draftStatuses[participant.enrolment_id] ?? participant.status;
    return status === participant.status ? [] : [{ enrolment_id: participant.enrolment_id, status }];
  });
  const counts = participants.reduce(
    (result, participant) => {
      const status = draftStatuses[participant.enrolment_id] ?? participant.status;
      result[status] += 1;
      return result;
    },
    { attended: 0, absent: 0, not_marked: 0 },
  );

  const setAttendanceStatus = (enrolmentId: string, status: LessonAttendanceStatus) => {
    setDraftStatuses((current) => ({ ...current, [enrolmentId]: status }));
    setFeedback(null);
  };

  const selectSession = (sessionId: string) => {
    if (sessionId === selectedSessionId) return;
    if (changedRecords.length > 0 && !window.confirm("Discard unsaved attendance changes and switch sessions?")) return;
    setSelectedSessionId(sessionId);
    setSelectedLessonId("");
    setFeedback(null);
    setQrCode("");
  };

  const selectLesson = (lessonId: string) => {
    if (lessonId === selectedLessonId) return;
    if (changedRecords.length > 0 && !window.confirm("Discard unsaved attendance changes and switch lessons?")) return;
    setSelectedLessonId(lessonId);
    setFeedback(null);
    setQrCode("");
  };

  const submitQrCode = (code: string) => {
    if (!selectedLessonId || !code.trim() || scanMutation.isPending) return;
    setFeedback(null);
    scanMutation.mutate({ lessonId: selectedLessonId, code: code.trim() });
  };

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-[#06201c]">Lesson attendance</h3>
        <p className="mt-1 text-sm text-[#52736a]">
          Record attendance for venue lessons by scanning an enrolment QR or marking the roster manually.
        </p>
      </div>

      {sectionsQuery.isLoading ? <p role="status" className="mt-5 text-sm text-[#52736a]">Loading sessions...</p> : null}
      {sectionsQuery.isError ? (
        <div className="mt-5 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3">
          <p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load Training sessions.</p>
          <button type="button" onClick={() => void sectionsQuery.refetch()} className="mt-2 text-sm font-semibold text-[#1f6a58] underline">Retry</button>
        </div>
      ) : null}
      {!sectionsQuery.isLoading && !sectionsQuery.isError && sessions.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-5 py-8 text-center">
          <p className="font-bold text-[#06201c]">No venue lessons available</p>
          <p className="mt-1 text-sm text-[#52736a]">Attendance check-in is available for venue lessons only.</p>
        </div>
      ) : null}

      {sessions.length > 0 ? (
        <>
          <TrainingSessionLessonPicker
            sessions={sessions}
            selectedSession={selectedSession}
            selectedLessonId={selectedLessonId}
            disabled={scanMutation.isPending || saveMutation.isPending}
            onSessionChange={selectSession}
            onLessonSelect={selectLesson}
          />

          {selectedLesson ? (
            <section className="mt-5 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">
                    Session {selectedSession?.number}: {selectedSession?.title}
                  </p>
                  <h4 className="mt-1 font-bold text-[#06201c]">
                    Lesson {selectedSession?.number}.{selectedLesson.number}: {selectedLesson.title}
                  </h4>
                  <p className="mt-1 text-xs text-[#52736a]">{humanizeLabel(selectedLesson.type)}</p>
                </div>
                {rosterQuery.data ? (
                  <div className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Attendance totals">
                    <span className="rounded-full bg-white px-3 py-1 text-[#31594d]">{participants.length} enrolled</span>
                    <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-[#1f6a58]">{counts.attended} attended</span>
                    <span className="rounded-full bg-[#fff6e8] px-3 py-1 text-[#8a5a12]">{counts.absent} absent</span>
                    <span className="rounded-full bg-white px-3 py-1 text-[#52736a]">{counts.not_marked} not marked</span>
                  </div>
                ) : null}
              </div>

              <TrainingLessonQrCheckIn
                value={qrCode}
                isPending={scanMutation.isPending}
                hasUnsavedChanges={changedRecords.length > 0}
                triggerRef={scannerTriggerRef}
                onValueChange={setQrCode}
                onOpenScanner={() => setScannerOpen(true)}
                onSubmit={() => submitQrCode(qrCode)}
              />

              {feedback ? (
                <p role={feedback.isError ? "alert" : "status"} className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${feedback.isError ? "border border-[#f3d5d1] bg-[#fff7f6] text-[#b42318]" : "border border-[#bce8d1] bg-[#effaf4] text-[#167550]"}`}>
                  {feedback.message}
                </p>
              ) : null}

              {rosterQuery.isLoading ? <p role="status" className="mt-5 text-sm text-[#52736a]">Loading enrolled participants...</p> : null}
              {rosterQuery.isError ? (
                <div className="mt-5 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3">
                  <p role="alert" className="text-sm font-semibold text-[#b42318]">Unable to load this lesson’s attendance roster.</p>
                  <button type="button" onClick={() => void rosterQuery.refetch()} className="mt-2 text-sm font-semibold text-[#1f6a58] underline">Retry</button>
                </div>
              ) : null}
              {!rosterQuery.isLoading && !rosterQuery.isError && participants.length === 0 ? (
                <p className="mt-5 rounded-lg border border-[#e1ebe6] bg-white px-3 py-4 text-sm text-[#52736a]">No enrolled participants to show.</p>
              ) : null}

              {participants.length > 0 && !rosterQuery.isError ? (
                <>
                  <TrainingLessonAttendanceRoster
                    participants={participants}
                    statuses={draftStatuses}
                    disabled={saveMutation.isPending || scanMutation.isPending}
                    onStatusChange={setAttendanceStatus}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[#52736a]">
                      {changedRecords.length === 0 ? "Attendance is up to date." : `${changedRecords.length} attendance ${changedRecords.length === 1 ? "change" : "changes"} to save.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedLessonId && changedRecords.length > 0) {
                          setFeedback(null);
                          saveMutation.mutate({ lessonId: selectedLessonId, records: changedRecords });
                        }
                      }}
                      disabled={changedRecords.length === 0 || saveMutation.isPending || scanMutation.isPending}
                      className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveMutation.isPending ? "Saving attendance..." : "Save attendance"}
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      {scannerOpen && selectedLesson ? (
        <QrScanner
          title={`Scan enrolment QR for ${selectedLesson.title}`}
          onClose={() => {
            setScannerOpen(false);
            window.requestAnimationFrame(() => scannerTriggerRef.current?.focus());
          }}
          onDetected={(code) => {
            setScannerOpen(false);
            submitQrCode(code);
            window.requestAnimationFrame(() => scannerTriggerRef.current?.focus());
          }}
        />
      ) : null}
    </section>
  );
}
