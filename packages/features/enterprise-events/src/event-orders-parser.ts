export interface EventOrder {
  id: string;
  participant_email: string;
  quantity: string;
  currency: string;
  status: string;
  refund_reason: string | null;
  updated_at?: string | null;
  event_id?: string | null;
  participant_name: string;
  ticket_type_id: string;
  amount: string;
  payment_status: string;
  payment_provider: string | null;
  created_at?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEventOrder(value: unknown): value is EventOrder {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.participant_email === "string" &&
    typeof value.quantity === "string" &&
    typeof value.currency === "string" &&
    typeof value.status === "string" &&
    (value.refund_reason === null || typeof value.refund_reason === "string") &&
    (value.updated_at === undefined || value.updated_at === null || typeof value.updated_at === "string") &&
    (value.event_id === undefined || value.event_id === null || typeof value.event_id === "string") &&
    typeof value.participant_name === "string" &&
    typeof value.ticket_type_id === "string" &&
    typeof value.amount === "string" &&
    typeof value.payment_status === "string" &&
    (value.payment_provider === null || typeof value.payment_provider === "string") &&
    (value.created_at === undefined || value.created_at === null || typeof value.created_at === "string");
}

/** Validates the backend-authoritative Event Orders collection response. */
export function parseEventOrdersResponse(value: unknown): readonly EventOrder[] {
  if (!Array.isArray(value) || !value.every(isEventOrder)) {
    throw new Error("Events API returned an invalid orders response.");
  }

  return value;
}
