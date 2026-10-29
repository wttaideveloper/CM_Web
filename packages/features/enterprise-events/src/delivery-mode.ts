export type EventDeliveryMode = "in_person" | "online" | "hybrid" | string;

/** Returns whether a configured Event field is relevant to the selected delivery mode. */
export function isDeliveryFieldApplicable(key: string, deliveryMode: EventDeliveryMode): boolean {
  if (!deliveryMode) return true;
  if (["venue", "location", "location_id"].includes(key)) return deliveryMode !== "online";
  if (["meeting_provider", "meeting_link"].includes(key)) return deliveryMode === "online" || deliveryMode === "hybrid";
  return true;
}
