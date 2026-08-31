import {
  isEventApprovalReview,
  type EventApprovalReview,
} from "./event-approval-review.types";

export class EventApprovalError extends Error {
  constructor() {
    super("Unable to approve this Event. Please try again.");
  }
}

async function parseEvent(response: Response): Promise<EventApprovalReview> {
  if (!response.ok) throw new EventApprovalError();
  const value = await response.json();
  if (!isEventApprovalReview(value)) throw new EventApprovalError();
  return value;
}

/** Loads the validated Event dossier used by the Platform Admin approval review. */
export async function getEventApprovalReview(eventId: string): Promise<EventApprovalReview> {
  const response = await fetch(
    `/api/v1/events/${encodeURIComponent(eventId)}`,
    { credentials: "include" },
  );
  return parseEvent(response);
}

/** Approves one pending Event, then verifies the persisted lifecycle state. */
export async function approveEvent(eventId: string): Promise<EventApprovalReview> {
  const response = await fetch(
    `/api/v1/events/${encodeURIComponent(eventId)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    },
  );
  await parseEvent(response);

  const persistedEvent = await getEventApprovalReview(eventId);
  if (persistedEvent.status !== "approved") throw new EventApprovalError();
  return persistedEvent;
}
