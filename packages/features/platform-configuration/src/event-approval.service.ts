import {
  isEventApprovalReview,
  type EventApprovalReview,
} from "./event-approval-review.types";

export class EventApprovalError extends Error {
  constructor() {
    super("Unable to approve this Event. Please try again.");
  }
}

/** Supported Super Admin Event approval decisions. */
export type EventApprovalDecision = "approve" | "request_changes" | "reject";

/** One status snapshot recorded in an Event approval audit entry. */
export interface EventAuditStatusSnapshot {
  status?: string;
  [key: string]: unknown;
}

/** Runtime-confirmed Event approval audit entry returned by the Platform API. */
export interface EventAuditRecord {
  id: string;
  event_id: string;
  changed_by: string | null;
  action: string;
  before: EventAuditStatusSnapshot;
  after: EventAuditStatusSnapshot;
  notes: string | null;
  created_at: string;
}

/** The runtime-confirmed approval-history response for one Event. */
export type EventApprovalHistoryResponse = readonly EventAuditRecord[];

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

/** Requests an Event revision and then verifies the persisted backend lifecycle state. */
export async function requestEventChanges(eventId: string, reason: string): Promise<EventApprovalReview> {
  return decideEventApproval(eventId, "request-changes", { reason }, "needs_revision");
}

/** Rejects an Event, optionally recording an admin reason, and verifies its persisted state. */
export async function rejectEvent(eventId: string, reason?: string): Promise<EventApprovalReview> {
  return decideEventApproval(eventId, "reject", reason?.trim() ? { reason: reason.trim() } : {}, "rejected");
}

/** Loads validated Event approval audit history through the authenticated same-origin proxy. */
export async function getEventApprovalHistory(eventId: string): Promise<EventApprovalHistoryResponse> {
  const response = await fetch(`/api/v1/admin/event-audits/${encodeURIComponent(eventId)}`, { credentials: "include" });
  if (!response.ok) throw new EventApprovalError();
  const value = await response.json() as unknown;
  if (!Array.isArray(value) || !value.every(isEventAuditRecord)) throw new EventApprovalError();
  return value;
}

async function decideEventApproval(eventId: string, path: "request-changes" | "reject", payload: { reason?: string }, expectedStatus: "needs_revision" | "rejected"): Promise<EventApprovalReview> {
  const response = await fetch(`/api/v1/admin/events/${encodeURIComponent(eventId)}/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new EventApprovalError();

  const persistedEvent = await getEventApprovalReview(eventId);
  if (persistedEvent.status !== expectedStatus) throw new EventApprovalError();
  return persistedEvent;
}

function isEventAuditStatusSnapshot(value: unknown): value is EventAuditStatusSnapshot {
  return typeof value === "object" && value !== null && !Array.isArray(value) && ((value as Record<string, unknown>).status === undefined || typeof (value as Record<string, unknown>).status === "string");
}

function isEventAuditRecord(value: unknown): value is EventAuditRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) && typeof (value as Record<string, unknown>).id === "string" && typeof (value as Record<string, unknown>).event_id === "string" && ((value as Record<string, unknown>).changed_by === null || typeof (value as Record<string, unknown>).changed_by === "string") && typeof (value as Record<string, unknown>).action === "string" && isEventAuditStatusSnapshot((value as Record<string, unknown>).before) && isEventAuditStatusSnapshot((value as Record<string, unknown>).after) && ((value as Record<string, unknown>).notes === null || typeof (value as Record<string, unknown>).notes === "string") && typeof (value as Record<string, unknown>).created_at === "string";
}
