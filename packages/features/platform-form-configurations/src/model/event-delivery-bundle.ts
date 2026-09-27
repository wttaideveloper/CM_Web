import type { ConfiguredField } from "./form-configuration.types";

export const EVENT_DELIVERY_BUNDLE = [
  "delivery_mode",
  "venue",
  "meeting_provider",
  "meeting_link",
] as const;

export type EventDeliveryBundleKey = (typeof EVENT_DELIVERY_BUNDLE)[number];

export function isEventDeliveryBundleKey(value: string | null | undefined): value is EventDeliveryBundleKey {
  return typeof value === "string" && (EVENT_DELIVERY_BUNDLE as readonly string[]).includes(value);
}

export function isEventDeliveryDependentKey(value: string | null | undefined): boolean {
  return isEventDeliveryBundleKey(value) && value !== "delivery_mode";
}

export function getEventDeliveryBundleFields(fields: readonly ConfiguredField[]): ConfiguredField[] {
  return EVENT_DELIVERY_BUNDLE.flatMap((key) => fields.filter((field) => field.coreKey === key));
}
