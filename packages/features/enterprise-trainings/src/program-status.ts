/** Backend-compatible Program lifecycle values accepted by the status endpoint. */
export const PROGRAM_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "published",
  "unpublished",
  "archived",
  "suspended",
  "cancelled",
  "rejected",
  "needs_revision",
] as const;

/** A backend-defined Program lifecycle status. */
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

/** Product-facing Program lifecycle values available in Enterprise Admin. */
export const PRODUCT_PROGRAM_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "published",
  "unpublished",
  "archived",
  "suspended",
  "cancelled",
  "rejected",
  "needs_revision",
] as const;

/** A product-facing Program lifecycle status. */
export type ProductProgramStatus = (typeof PRODUCT_PROGRAM_STATUSES)[number];

/** Request body accepted by PATCH /api/v1/programs/{program_id}/status. */
export interface ProgramStatusUpdatePayload {
  status: ProgramStatus;
  reason?: string | null;
}

/** A user-facing lifecycle operation that is proven valid for the current status. */
export interface ProgramStatusAction {
  targetStatus: ProgramStatus;
  label: string;
  confirmationTitle: string;
  confirmationDescription: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
}

const statusLabels: Record<ProductProgramStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
  suspended: "Suspended",
  cancelled: "Cancelled",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

const statusBadgeClasses: Record<ProductProgramStatus, string> = {
  draft: "bg-[#fff7e5] text-[#b7791f]",
  pending_approval: "bg-[#fff7e5] text-[#b7791f]",
  approved: "bg-[#e8f6ee] text-[#16825b]",
  published: "bg-[#e8f6ee] text-[#16825b]",
  unpublished: "bg-[#f1f4f3] text-[#6b7f79]",
  archived: "bg-[#f1f4f3] text-[#6b7f79]",
  suspended: "bg-[#fff1ef] text-[#b42318]",
  cancelled: "bg-[#fff1ef] text-[#b42318]",
  rejected: "bg-[#fff1ef] text-[#b42318]",
  needs_revision: "bg-[#fff7e5] text-[#b7791f]",
};

const submitForApprovalAction: ProgramStatusAction = {
  targetStatus: "pending_approval",
  label: "Submit for approval",
  confirmationTitle: "Submit program for approval?",
  confirmationDescription: "Review the program information before submitting it for approval.",
  confirmLabel: "Submit for approval",
  cancelLabel: "Keep editing",
  pendingLabel: "Submitting...",
};

const publishProgramAction: ProgramStatusAction = {
  targetStatus: "published",
  label: "Publish program",
  confirmationTitle: "Publish program?",
  confirmationDescription: "This changes the program lifecycle status to Published.",
  confirmLabel: "Publish program",
  cancelLabel: "Keep draft",
  pendingLabel: "Publishing...",
};

const unpublishProgramAction: ProgramStatusAction = {
  targetStatus: "unpublished",
  label: "Unpublish",
  confirmationTitle: "Unpublish program?",
  confirmationDescription: "The program will no longer be publicly published.",
  confirmLabel: "Unpublish",
  cancelLabel: "Keep published",
  pendingLabel: "Unpublishing...",
};

const suspendProgramAction: ProgramStatusAction = {
  targetStatus: "suspended",
  label: "Suspend program",
  confirmationTitle: "Suspend program?",
  confirmationDescription: "The program will be temporarily unavailable until it is resumed.",
  confirmLabel: "Suspend program",
  cancelLabel: "Keep program",
  pendingLabel: "Suspending...",
};

const cancelProgramAction: ProgramStatusAction = {
  targetStatus: "cancelled",
  label: "Cancel program",
  confirmationTitle: "Cancel program?",
  confirmationDescription: "The program will be cancelled. You can optionally record a reason for this change.",
  confirmLabel: "Cancel program",
  cancelLabel: "Keep program",
  pendingLabel: "Cancelling...",
};

const archiveProgramAction: ProgramStatusAction = {
  targetStatus: "archived",
  label: "Archive program",
  confirmationTitle: "Archive program?",
  confirmationDescription: "The program will be archived and hidden from active listings.",
  confirmLabel: "Archive program",
  cancelLabel: "Keep program",
  pendingLabel: "Archiving...",
};

const restoreProgramAction: ProgramStatusAction = {
  targetStatus: "draft",
  label: "Save to draft",
  confirmationTitle: "Restore program to draft?",
  confirmationDescription: "The program will return to Draft and be editable again (clears archive).",
  confirmLabel: "Save to draft",
  cancelLabel: "Keep archived",
  pendingLabel: "Restoring...",
};

/** Returns whether a value is a Program status recognized by the current backend contract. */
export function isProgramStatus(value: unknown): value is ProgramStatus {
  return typeof value === "string" && PROGRAM_STATUSES.includes(value as ProgramStatus);
}

/** Returns whether a backend status is part of the Enterprise Admin product lifecycle. */
export function isProductProgramStatus(status: ProgramStatus): status is ProductProgramStatus {
  return PRODUCT_PROGRAM_STATUSES.includes(status as ProductProgramStatus);
}

/** Converts a backend status into a human-readable label. */
export function getProgramStatusLabel(status: ProgramStatus): string {
  return isProductProgramStatus(status) ? statusLabels[status] : "Status unavailable";
}

/** Returns the shared Enterprise Admin badge styling for a Program status. */
export function getProgramStatusBadgeClass(status: ProgramStatus): string {
  return isProductProgramStatus(status) ? statusBadgeClasses[status] : "bg-[#f1f4f3] text-[#6b7f79]";
}

/** Returns Enterprise Admin lifecycle actions supported by the status contract. */
export function getProgramStatusActions(status: ProgramStatus): readonly ProgramStatusAction[] {
  if (status === "draft") return [submitForApprovalAction, cancelProgramAction];
  if (status === "pending_approval") return [cancelProgramAction];
  if (status === "approved") return [publishProgramAction, cancelProgramAction];
  if (status === "published") return [unpublishProgramAction, suspendProgramAction, archiveProgramAction, cancelProgramAction];
  if (status === "unpublished") return [publishProgramAction, cancelProgramAction];
  if (status === "archived") return [restoreProgramAction];
  if (status === "suspended") return [publishProgramAction, cancelProgramAction];
  if (status === "cancelled") return [];
  if (status === "rejected" || status === "needs_revision") return [submitForApprovalAction, cancelProgramAction];
  return [];
}

/** Returns whether the current product workflow permits Enterprise Admin editing. */
export function canEditProgram(status: ProgramStatus): boolean {
  return status === "draft" || status === "rejected" || status === "needs_revision" || status === "unpublished";
}

/** Returns whether the current Enterprise Admin policy permits destructive deletion. */
export function canDeleteProgram(status: ProgramStatus): boolean {
  return status === "draft" || status === "cancelled" || status === "archived";
}