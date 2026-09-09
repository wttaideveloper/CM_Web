/** Backend-compatible Training lifecycle values accepted by the status endpoint. */
export const TRAINING_STATUSES = [
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

/** A backend-defined Training lifecycle status. */
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

/** Product-facing Training lifecycle values available in Enterprise Admin. */
export const PRODUCT_TRAINING_STATUSES = [
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

/** A product-facing Training lifecycle status. */
export type ProductTrainingStatus = (typeof PRODUCT_TRAINING_STATUSES)[number];

/** Request body accepted by PATCH /api/v1/trainings/{training_id}/status. */
export interface TrainingStatusUpdatePayload {
  status: TrainingStatus;
  reason?: string | null;
}

/** A user-facing lifecycle operation that is proven valid for the current status. */
export interface TrainingStatusAction {
  targetStatus: TrainingStatus;
  label: string;
  confirmationTitle: string;
  confirmationDescription: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
}

const statusLabels: Record<ProductTrainingStatus, string> = {
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

const statusBadgeClasses: Record<ProductTrainingStatus, string> = {
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

const submitForApprovalAction: TrainingStatusAction = {
  targetStatus: "pending_approval",
  label: "Submit for approval",
  confirmationTitle: "Submit training for approval?",
  confirmationDescription: "Review the training information before submitting it for approval.",
  confirmLabel: "Submit for approval",
  cancelLabel: "Keep editing",
  pendingLabel: "Submitting...",
};

const publishTrainingAction: TrainingStatusAction = {
  targetStatus: "published",
  label: "Publish training",
  confirmationTitle: "Publish training?",
  confirmationDescription: "This changes the training lifecycle status to Published.",
  confirmLabel: "Publish training",
  cancelLabel: "Keep draft",
  pendingLabel: "Publishing...",
};

const unpublishTrainingAction: TrainingStatusAction = {
  targetStatus: "unpublished",
  label: "Unpublish",
  confirmationTitle: "Unpublish training?",
  confirmationDescription: "The training will no longer be publicly published.",
  confirmLabel: "Unpublish",
  cancelLabel: "Keep published",
  pendingLabel: "Unpublishing...",
};

const archiveTrainingAction: TrainingStatusAction = {
  targetStatus: "archived",
  label: "Archive training",
  confirmationTitle: "Archive training?",
  confirmationDescription: "The training will be archived and hidden from active listings.",
  confirmLabel: "Archive training",
  cancelLabel: "Keep training",
  pendingLabel: "Archiving...",
};

const suspendTrainingAction: TrainingStatusAction = {
  targetStatus: "suspended",
  label: "Suspend training",
  confirmationTitle: "Suspend training?",
  confirmationDescription: "The training will be temporarily unavailable until it is resumed.",
  confirmLabel: "Suspend training",
  cancelLabel: "Keep training",
  pendingLabel: "Suspending...",
};

const cancelTrainingAction: TrainingStatusAction = {
  targetStatus: "cancelled",
  label: "Cancel training",
  confirmationTitle: "Cancel training?",
  confirmationDescription: "The training will be cancelled. You can optionally record a reason for this change.",
  confirmLabel: "Cancel training",
  cancelLabel: "Keep training",
  pendingLabel: "Cancelling...",
};

const restoreTrainingAction: TrainingStatusAction = {
  targetStatus: "draft",
  label: "Save to draft",
  confirmationTitle: "Restore training to draft?",
  confirmationDescription: "The training will return to Draft and be editable again (clears archive).",
  confirmLabel: "Save to draft",
  cancelLabel: "Keep archived",
  pendingLabel: "Restoring...",
};

/** Returns whether a value is a Training status recognized by the current backend contract. */
export function isTrainingStatus(value: unknown): value is TrainingStatus {
  return typeof value === "string" && TRAINING_STATUSES.includes(value as TrainingStatus);
}

/** Returns whether a backend status is part of the Enterprise Admin product lifecycle. */
export function isProductTrainingStatus(status: TrainingStatus): status is ProductTrainingStatus {
  return PRODUCT_TRAINING_STATUSES.includes(status as ProductTrainingStatus);
}

/** Converts a backend status into a human-readable label. */
export function getTrainingStatusLabel(status: TrainingStatus): string {
  return isProductTrainingStatus(status) ? statusLabels[status] : "Status unavailable";
}

/** Returns the shared Enterprise Admin badge styling for a Training status. */
export function getTrainingStatusBadgeClass(status: TrainingStatus): string {
  return isProductTrainingStatus(status) ? statusBadgeClasses[status] : "bg-[#f1f4f3] text-[#6b7f79]";
}

/** Returns Enterprise Admin lifecycle actions supported by the status contract. */
export function getTrainingStatusActions(status: TrainingStatus): readonly TrainingStatusAction[] {
  if (status === "draft") return [submitForApprovalAction, cancelTrainingAction];
  if (status === "pending_approval") return [cancelTrainingAction];
  if (status === "approved") return [publishTrainingAction, cancelTrainingAction];
  if (status === "published") return [unpublishTrainingAction, suspendTrainingAction, archiveTrainingAction, cancelTrainingAction];
  if (status === "unpublished") return [publishTrainingAction, cancelTrainingAction];
  if (status === "archived") return [restoreTrainingAction];
  if (status === "suspended") return [publishTrainingAction, cancelTrainingAction];
  if (status === "cancelled") return [];
  if (status === "rejected" || status === "needs_revision") return [submitForApprovalAction, cancelTrainingAction];
  return [];
}

/** Returns whether the current product workflow permits Enterprise Admin editing. */
export function canEditTraining(status: TrainingStatus): boolean {
  return status === "draft" || status === "rejected" || status === "needs_revision" || status === "unpublished";
}

/** Returns whether the current Enterprise Admin policy permits destructive deletion. */
export function canDeleteTraining(status: TrainingStatus): boolean {
  return status === "draft" || status === "cancelled" || status === "archived";
}