"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminGetTraining,
  approveTraining,
  getTrainingModerationHistory,
  listPendingTrainings,
  rejectTraining,
  requestChangesTraining,
  TrainingsApiError,
} from "./trainings.service";
import { formatTrainingDate, humanizeLabel } from "./detail-formatters";
import { getTrainingStatusBadgeClass, getTrainingStatusLabel, type TrainingStatus } from "./training-status";

function ApprovalNoteForm({
  trainingId,
  kind,
  onDone,
}: {
  trainingId: string;
  kind: "reject" | "request-changes";
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (kind === "reject") return rejectTraining(trainingId);
      return requestChangesTraining(trainingId, reason.trim());
    },
    onSuccess: () => {
      setFeedback(kind === "reject" ? "Training rejected." : "Changes requested.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "trainings", "pending"] });
      setTimeout(onDone, 800);
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Action failed."),
  });

  return (
    <div className="space-y-3">
      {kind === "request-changes" ? (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what changes are needed..."
          rows={3}
          className="w-full rounded-xl border border-[#d7e5df] bg-white px-4 py-2 text-sm outline-none focus:border-[#1f6a58]"
        />
      ) : null}
      {feedback ? (
        <p role="status" className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">
          {feedback}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (kind === "reject" || reason.trim()) mutation.mutate();
          }}
          disabled={mutation.isPending || (kind === "request-changes" && !reason.trim())}
          className={`h-9 rounded-full px-4 text-xs font-bold text-white disabled:opacity-60 ${
            kind === "reject" ? "bg-[#b42318]" : "bg-[#1f6a58]"
          }`}
        >
          {mutation.isPending ? "Processing..." : kind === "reject" ? "Confirm Reject" : "Send Changes"}
        </button>
        <button type="button" onClick={onDone} className="h-9 rounded-full border border-[#d7e5df] px-4 text-xs font-bold text-[#52736a]">
          Cancel
        </button>
      </div>
    </div>
  );
}

function AdminDetail({ trainingId, onBack }: { trainingId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<"reject" | "request-changes" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "trainings", trainingId],
    queryFn: () => adminGetTraining(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });

  const moderationQuery = useQuery({
    queryKey: ["trainings", trainingId, "moderation-history"],
    queryFn: () => getTrainingModerationHistory(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: () => approveTraining(trainingId),
    onSuccess: () => {
      setFeedback("Training approved.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "trainings", "pending"] });
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Approval failed."),
  });

  if (detailQuery.isLoading) return <p className="text-sm text-[#52736a]">Loading training details...</p>;
  if (detailQuery.isError) return <p className="text-sm font-semibold text-[#b42318]">{(detailQuery.error as Error).message}</p>;

  const training = (detailQuery.data ?? {}) as Record<string, unknown>;
  const title = typeof training.title === "string" ? training.title : "Untitled Training";
  const status = typeof training.status === "string" ? training.status : "unknown";
  const description = typeof training.description === "string" ? training.description : "";
  const category = typeof training.category === "string" ? training.category : "";
  const instructor = typeof training.instructor_id === "string" ? training.instructor_id : "";
  const price = typeof training.price === "number" ? training.price : null;
  const currency = typeof training.currency === "string" ? training.currency : "USD";
  const capacity = typeof training.capacity === "number" ? training.capacity : null;
  const createdAt = typeof training.created_at === "string" ? training.created_at : null;
  const sections = Array.isArray(training.sections) ? training.sections : [];
  const moderationHistory = Array.isArray(moderationQuery.data) ? moderationQuery.data : [];

  return (
    <div className="w-full">
      <button type="button" onClick={onBack} className="mb-4 text-sm font-semibold text-[#1f6a58] underline">
        ← Back to pending queue
      </button>

      <div className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{category || "TRAINING"}</p>
            <h2 className="mt-1 text-2xl font-bold text-[#06201c]">{title}</h2>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${getTrainingStatusBadgeClass(status as TrainingStatus)}`}>
              {getTrainingStatusLabel(status as TrainingStatus)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => setAction(action === "reject" ? null : "reject")}
              className="h-10 rounded-full border border-[#b42318] px-5 text-sm font-bold text-[#b42318] hover:bg-[#fff7f6]"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setAction(action === "request-changes" ? null : "request-changes")}
              className="h-10 rounded-full border border-[#d7e5df] px-5 text-sm font-bold text-[#52736a] hover:bg-[#f9fcfa]"
            >
              Request Changes
            </button>
          </div>
        </div>

        {feedback ? (
          <p role="status" className="mt-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">
            {feedback}
          </p>
        ) : null}

        {action ? (
          <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
            <ApprovalNoteForm trainingId={trainingId} kind={action} onDone={() => { setAction(null); setFeedback(null); }} />
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Description</p>
            <p className="mt-1 text-sm leading-6 text-[#52736a]">{description || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Instructor</p>
            <p className="mt-1 text-sm font-semibold text-[#06201c]">{instructor || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Price</p>
            <p className="mt-1 text-sm font-semibold text-[#06201c]">{price !== null ? `${currency} ${price.toFixed(2)}` : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Capacity</p>
            <p className="mt-1 text-sm font-semibold text-[#06201c]">{capacity !== null ? String(capacity) : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Created</p>
            <p className="mt-1 text-sm font-semibold text-[#06201c]">{formatTrainingDate(createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Sections</p>
            <p className="mt-1 text-sm font-semibold text-[#06201c]">{String(sections.length)}</p>
          </div>
        </div>

        {sections.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Course Structure</p>
            <ul className="mt-2 space-y-2">
              {sections.map((raw, index) => {
                const section = raw as Record<string, unknown>;
                const sId = typeof section.id === "string" ? section.id : String(index);
                const sTitle = typeof section.title === "string" ? section.title : `Section ${index + 1}`;
                const lessons = Array.isArray(section.lessons) ? section.lessons : [];
                return (
                  <li key={sId} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3">
                    <p className="text-sm font-bold text-[#06201c]">{sTitle}</p>
                    {lessons.length > 0 ? (
                      <ul className="mt-2 space-y-1 pl-4">
                        {lessons.map((rawLesson, lIndex) => {
                          const lesson = rawLesson as Record<string, unknown>;
                          const lTitle = typeof lesson.title === "string" ? lesson.title : `Lesson ${lIndex + 1}`;
                          return <li key={lIndex} className="text-xs text-[#52736a]">• {lTitle}</li>;
                        })}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-[#7f9d94]">No lessons</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {moderationHistory.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Moderation History</p>
            <ul className="mt-2 space-y-2">
              {moderationHistory.map((raw, index) => {
                const record = raw as Record<string, unknown>;
                const action = typeof record.action === "string" ? record.action : typeof record.status === "string" ? record.status : "";
                const note = [record.note, record.message, record.reason, record.comment].find((v): v is string => typeof v === "string" && v.trim().length > 0);
                const performedBy = typeof record.performed_by === "string" ? record.performed_by : typeof record.admin_name === "string" ? record.admin_name : null;
                const performedAt = typeof record.created_at === "string" ? record.created_at : typeof record.performed_at === "string" ? record.performed_at : null;
                return (
                  <li key={index} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">{humanizeLabel(action)}</span>
                      {performedBy ? <span className="text-xs text-[#7f9d94]">by {performedBy}</span> : null}
                      {performedAt ? <span className="text-xs text-[#7f9d94]">{formatTrainingDate(performedAt)}</span> : null}
                    </div>
                    {note ? <p className="mt-1 text-sm text-[#52736a]">{note}</p> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Platform admin approval queue screen — pending trainings with approve/reject/request-changes. */
export function PlatformApprovalScreen() {
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["admin", "trainings", "pending"],
    queryFn: () => listPendingTrainings(),
    staleTime: 30_000,
  });

  if (selectedTrainingId) {
    return <AdminDetail trainingId={selectedTrainingId} onBack={() => setSelectedTrainingId(null)} />;
  }

  const pending = Array.isArray(pendingQuery.data) ? pendingQuery.data : [];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#06201c]">Pending Training Approvals</h1>
        <p className="mt-1 text-sm text-[#52736a]">Review and approve training submissions from enterprises.</p>
      </div>

      {feedback ? (
        <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">
          {feedback}
        </p>
      ) : null}

      {pendingQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading pending trainings...</p> : null}
      {pendingQuery.isError ? <p className="text-sm font-semibold text-[#b42318]">{(pendingQuery.error as Error).message}</p> : null}
      {!pendingQuery.isLoading && !pendingQuery.isError && pending.length === 0 ? (
        <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">No pending trainings</p>
          <p className="mt-2 text-sm text-[#52736a]">All caught up! Trainings will appear here when submitted for approval.</p>
        </div>
      ) : null}

      <ul className="grid gap-3">
        {pending.map((raw, index) => {
          const training = raw as Record<string, unknown>;
          const id = typeof training.id === "string" ? training.id : String(index);
          const title = typeof training.title === "string" ? training.title : "Untitled";
          const status = typeof training.status === "string" ? training.status : "pending";
          const category = typeof training.category === "string" ? training.category : "";
          const createdAt = typeof training.created_at === "string" ? training.created_at : null;
          const enterpriseName = typeof training.enterprise_name === "string" ? training.enterprise_name : typeof training.enterprise === "string" ? training.enterprise : null;
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#06201c]">{title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getTrainingStatusBadgeClass(status as TrainingStatus)}`}>
                      {getTrainingStatusLabel(status as TrainingStatus)}
                  </span>
                </div>
                {category ? <p className="mt-1 text-xs text-[#7f9d94]">{category}</p> : null}
                {enterpriseName ? <p className="mt-1 text-xs text-[#7f9d94]">by {enterpriseName}</p> : null}
                {createdAt ? <p className="mt-1 text-xs text-[#7f9d94]">{formatTrainingDate(createdAt)}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrainingId(id)}
                className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white"
              >
                Review
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
