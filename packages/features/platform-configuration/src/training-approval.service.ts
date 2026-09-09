import {
  isTrainingApprovalReview,
  type TrainingApprovalReview,
} from "./training-approval-review.types";

export class TrainingApprovalError extends Error {
  constructor() {
    super("Unable to approve this Training. Please try again.");
  }
}

/** Supported Super Admin Training approval decisions. */
export type TrainingApprovalDecision = "approve" | "request_changes" | "reject";

const trainingsBasePath = "/api/v1/trainings/";

async function parseTraining(response: Response): Promise<TrainingApprovalReview> {
  if (!response.ok) throw new TrainingApprovalError();
  const value = await response.json();
  if (!isTrainingApprovalReview(value)) throw new TrainingApprovalError();
  return value;
}

/** Loads the validated Training dossier used by the Platform Admin approval review. */
export async function getTrainingApprovalReview(trainingId: string): Promise<TrainingApprovalReview> {
  const response = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}`,
    { credentials: "include" },
  );
  return parseTraining(response);
}

/** Approves one pending Training. The list queues reflect the persisted state via invalidation. */
export async function approveTrainingReview(trainingId: string): Promise<void> {
  const response = await fetch(
    `/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/approve`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!response.ok) throw new TrainingApprovalError();
}

/** Sends a Training back for revision with a required admin note — `POST /admin/trainings/{id}/request-changes`. */
export async function requestTrainingChanges(trainingId: string, reason: string): Promise<void> {
  const response = await fetch(`/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/request-changes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    // Request-changes requires `payload.reason` (backend rejects a missing reason).
    body: JSON.stringify({ reason: reason.trim() }),
  });
  if (!response.ok) throw new TrainingApprovalError();
}

/** Rejects a Training, optionally recording an admin reason. The list queues reflect the persisted state via invalidation. */
export async function rejectTrainingReview(trainingId: string, reason?: string): Promise<void> {
  const response = await fetch(`/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/reject`, {
    method: "POST",
    credentials: "include",
    // Reject accepts { reason } (optional) or no body (null) — never {} (422).
    ...(reason?.trim() ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason.trim() }) } : {}),
  });
  if (!response.ok) throw new TrainingApprovalError();
}

/** A single moderation-history record (undocumented response shape — guard with runtime checks). */
export interface ModerationHistoryEntry {
  id?: string;
  action?: string;
  from_status?: string | null;
  to_status?: string | null;
  status?: string | null;
  reason?: string | null;
  performed_by?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
  [key: string]: unknown;
}

/** Loads moderation / approval history for a Training. Response schema is undocumented; returns whatever the backend sends. */
export async function getTrainingModerationHistory(trainingId: string): Promise<ModerationHistoryEntry[]> {
  const response = await fetch(
    `/api/v1/trainings/${encodeURIComponent(trainingId)}/moderation-history`,
    { credentials: "include", cache: "no-store" },
  );
  if (!response.ok) return [];
  const body = await response.json().catch(() => null);
  if (Array.isArray(body)) return body as ModerationHistoryEntry[];
  if (body && typeof body === "object" && Array.isArray(body.history)) return body.history as ModerationHistoryEntry[];
  if (body && typeof body === "object" && Array.isArray(body.items)) return body.items as ModerationHistoryEntry[];
  return [];
}