import {
  isProgramApprovalReview,
  type ProgramApprovalReview,
} from "./program-approval-review.types";

export class ProgramApprovalError extends Error {
  constructor() {
    super("Unable to approve this Program. Please try again.");
  }
}

/** Supported Super Admin Program approval decisions. */
export type ProgramApprovalDecision = "approve" | "reject";

const programsBasePath = "/api/v1/programs/";

async function parseProgram(response: Response): Promise<ProgramApprovalReview> {
  if (!response.ok) throw new ProgramApprovalError();
  const value = await response.json();
  if (!isProgramApprovalReview(value)) throw new ProgramApprovalError();
  return value;
}

/** Loads the validated Program dossier used by the Platform Admin approval review. */
export async function getProgramApprovalReview(programId: string): Promise<ProgramApprovalReview> {
  const response = await fetch(
    `${programsBasePath}${encodeURIComponent(programId)}`,
    { credentials: "include" },
  );
  return parseProgram(response);
}

/** Approves one pending Program. The list queues reflect the persisted state via invalidation. */
export async function approveProgramReview(programId: string): Promise<void> {
  const response = await fetch(
    `/api/v1/admin/programs/${encodeURIComponent(programId)}/approve`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!response.ok) throw new ProgramApprovalError();
}

/** Rejects a Program, optionally recording an admin reason. The list queues reflect the persisted state via invalidation. */
export async function rejectProgramReview(programId: string, reason?: string): Promise<void> {
  const trimmedReason = reason?.trim();
  const response = await fetch(`/api/v1/admin/programs/${encodeURIComponent(programId)}/reject`, {
    method: "POST",
    credentials: "include",
    // The reject endpoint accepts { reason } or no body (null) — never an empty object {} (422).
    ...(trimmedReason ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: trimmedReason }) } : {}),
  });
  if (!response.ok) throw new ProgramApprovalError();
}