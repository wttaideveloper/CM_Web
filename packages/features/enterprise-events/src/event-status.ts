/** Backend-compatible Event lifecycle values accepted by the status endpoint. */
export const EVENT_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "published",
  "cancelled",
  "completed",
  "suspended",
  "rejected",
  "needs_revision",
  "active",
  "inactive",
] as const;

/** A backend-defined Event lifecycle status. */
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Product-facing Event lifecycle values available in Enterprise Admin. */
export const PRODUCT_EVENT_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "published",
  "cancelled",
  "completed",
  "suspended",
  "rejected",
  "needs_revision",
] as const;

/** A product-facing Event lifecycle status. */
export type ProductEventStatus = (typeof PRODUCT_EVENT_STATUSES)[number];

/** Request body accepted by PATCH /api/v1/events/{event_id}/status. */
export interface EventStatusUpdatePayload {
  status: EventStatus;
  reason?: string | null;
}

/** A user-facing lifecycle operation that is proven valid for the current status. */
export interface EventStatusAction {
  targetStatus: EventStatus;
  label: string;
  confirmationTitle: string;
  confirmationDescription: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
}

const statusLabels: Record<ProductEventStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  published: "Published",
  cancelled: "Cancelled",
  completed: "Completed",
  suspended: "Suspended",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

const statusBadgeClasses: Record<ProductEventStatus, string> = {
  draft: "bg-[#fff7e5] text-[#b7791f]",
  pending_approval: "bg-[#fff7e5] text-[#b7791f]",
  approved: "bg-[#e8f6ee] text-[#16825b]",
  published: "bg-[#e8f6ee] text-[#16825b]",
  cancelled: "bg-[#fff1ef] text-[#b42318]",
  completed: "bg-[#f1f4f3] text-[#6b7f79]",
  suspended: "bg-[#fff1ef] text-[#b42318]",
  rejected: "bg-[#fff1ef] text-[#b42318]",
  needs_revision: "bg-[#fff7e5] text-[#b7791f]",
};

const submitForApprovalAction: EventStatusAction = {
  targetStatus: "pending_approval",
  label: "Submit for approval",
  confirmationTitle: "Submit event for approval?",
  confirmationDescription: "Review the event information before submitting it for approval.",
  confirmLabel: "Submit for approval",
  cancelLabel: "Keep editing",
  pendingLabel: "Submitting...",
};

const publishEventAction: EventStatusAction = {
  targetStatus: "published",
  label: "Publish event",
  confirmationTitle: "Publish event?",
  confirmationDescription: "This changes the event lifecycle status to Published.",
  confirmLabel: "Publish event",
  cancelLabel: "Keep approved",
  pendingLabel: "Publishing...",
};

const cancelEventAction: EventStatusAction = {
  targetStatus: "cancelled",
  label: "Cancel event",
  confirmationTitle: "Cancel event?",
  confirmationDescription: "The event will be cancelled. You can optionally record a reason for this change.",
  confirmLabel: "Cancel event",
  cancelLabel: "Keep event",
  pendingLabel: "Cancelling...",
};

const restoreEventAction: EventStatusAction = {
  targetStatus: "draft",
  label: "Restore to draft",
  confirmationTitle: "Restore event to draft?",
  confirmationDescription: "The event will return to Draft so its details can be reviewed and edited.",
  confirmLabel: "Restore to draft",
  cancelLabel: "Keep cancelled",
  pendingLabel: "Restoring...",
};

const suspendEventAction: EventStatusAction = {
  targetStatus: "suspended",
  label: "Suspend event",
  confirmationTitle: "Suspend event?",
  confirmationDescription: "The event will be temporarily unavailable until it is resumed.",
  confirmLabel: "Suspend event",
  cancelLabel: "Keep published",
  pendingLabel: "Suspending...",
};

const resumeEventAction: EventStatusAction = {
  targetStatus: "published",
  label: "Resume event",
  confirmationTitle: "Resume event?",
  confirmationDescription: "The event will return to Published.",
  confirmLabel: "Resume event",
  cancelLabel: "Keep suspended",
  pendingLabel: "Resuming...",
};

const unpublishEventAction: EventStatusAction = {
  targetStatus: "approved",
  label: "Unpublish",
  confirmationTitle: "Unpublish event?",
  confirmationDescription: "The event will no longer be publicly published and will return to Approved.",
  confirmLabel: "Unpublish",
  cancelLabel: "Keep published",
  pendingLabel: "Unpublishing...",
};

/** Returns whether a value is an Event status recognized by the current backend contract. */
export function isEventStatus(value: unknown): value is EventStatus {
  return typeof value === "string" && EVENT_STATUSES.includes(value as EventStatus);
}

/** Returns whether a backend status is part of the Enterprise Admin product lifecycle. */
export function isProductEventStatus(status: EventStatus): status is ProductEventStatus {
  return PRODUCT_EVENT_STATUSES.includes(status as ProductEventStatus);
}

/** Converts a backend status into a human-readable label. */
export function getEventStatusLabel(status: EventStatus): string {
  return isProductEventStatus(status) ? statusLabels[status] : "Status unavailable";
}

/** Returns the shared Enterprise Admin badge styling for an Event status. */
export function getEventStatusBadgeClass(status: EventStatus): string {
  return isProductEventStatus(status) ? statusBadgeClasses[status] : "bg-[#f1f4f3] text-[#6b7f79]";
}

/**
 * Returns Enterprise Admin lifecycle actions supported by the status PATCH contract.
 */
export function getEventStatusActions(status: EventStatus): readonly EventStatusAction[] {
  if (status === "draft") return [submitForApprovalAction, cancelEventAction];
  if (status === "pending_approval") return [cancelEventAction];
  if (status === "approved") return [publishEventAction, cancelEventAction];
  if (status === "published") return [suspendEventAction, unpublishEventAction, cancelEventAction];
  if (status === "suspended") return [resumeEventAction, cancelEventAction];
  if (status === "cancelled") return [restoreEventAction];
  return [];
}

/** Returns whether the current product workflow permits Enterprise Admin editing. */
export function canEditEvent(status: EventStatus): boolean {
  return status === "draft" || status === "rejected" || status === "needs_revision";
}

/** Returns whether the current Enterprise Admin policy permits destructive deletion. */
export function canDeleteEvent(status: EventStatus): boolean {
  return status === "draft";
}
