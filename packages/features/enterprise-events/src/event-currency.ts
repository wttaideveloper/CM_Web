import type { CreateEventFormValues } from "./create-event-form";
import type { ActiveEventFormConfiguration, ActiveEventFormField } from "./events.service";

/** Identifies the editable currency control that established the Event currency. */
export type EventCurrencySource =
  | { kind: "base" }
  | { kind: "ticket_types" | "meals" | "accommodation"; index: number };

/** Describes which currency-bearing controls are active for a configured Event form. */
export interface EventCurrencyPolicy {
  baseEnabled: boolean;
  ticketTypesEnabled: boolean;
  mealsEnabled: boolean;
  accommodationEnabled: boolean;
}

/** UI state shared by the create-only currency controls. */
export interface EventCurrencyUiState {
  value: string;
  source: EventCurrencySource | null;
  isLocked: (source: EventCurrencySource) => boolean;
}

export const EVENT_CURRENCY_MISMATCH_ERROR = "All Event prices must use the selected Event currency.";

function fieldKey(field: ActiveEventFormField): string {
  return (field.core_key ?? field.stable_key ?? field.id).replace(/^(core_|custom_)/, "").trim().toLowerCase();
}

function activeFields(configuration: ActiveEventFormConfiguration): ActiveEventFormField[] {
  return configuration.sections
    .filter((section) => section.is_enabled)
    .flatMap((section) => section.fields)
    .filter((field) => field.is_enabled !== false && field.source === "core");
}

function compositeCurrencyEnabled(field: ActiveEventFormField | undefined): boolean {
  if (!field) return false;
  const enabledFields = field.composite_config?.enabled_fields;
  return !enabledFields || enabledFields.includes("currency");
}

/** Resolves currency-bearing controls from active configuration identifiers, not labels or order. */
export function getEventCurrencyPolicy(configuration: ActiveEventFormConfiguration): EventCurrencyPolicy {
  const fields = activeFields(configuration);
  const baseField = fields.find((field) => fieldKey(field) === "currency");
  const ticketField = fields.find((field) => fieldKey(field) === "ticket_types" || field.renderer === "ticket_types");
  return {
    baseEnabled: Boolean(baseField),
    ticketTypesEnabled: compositeCurrencyEnabled(ticketField),
    // Meals and accommodation are rendered from the selected Event Type modules.
    mealsEnabled: true,
    accommodationEnabled: true,
  };
}

function sourceAvailable(values: CreateEventFormValues, policy: EventCurrencyPolicy, source: EventCurrencySource): boolean {
  if (source.kind === "base") return policy.baseEnabled && values.pricing_type === "paid";
  if (source.kind === "ticket_types") return policy.ticketTypesEnabled && values.pricing_type === "paid" && values.modules?.tickets !== false && Boolean(values.ticket_types[source.index]);
  if (source.kind === "meals") return policy.mealsEnabled && values.modules?.meals === true && Boolean(values.meals?.options?.[source.index]);
  return policy.accommodationEnabled && values.modules?.accommodation === true && Boolean(values.accommodation?.options?.[source.index]);
}

/** Returns the preferred source when it still exists, otherwise the first applicable source. */
export function resolveEventCurrencySource(
  values: CreateEventFormValues,
  policy: EventCurrencyPolicy,
  preferred: EventCurrencySource | null,
): EventCurrencySource | null {
  if (preferred && sourceAvailable(values, policy, preferred)) return preferred;
  if (sourceAvailable(values, policy, { kind: "base" })) return { kind: "base" };
  const candidates: EventCurrencySource[] = [
    ...values.ticket_types.map((_, index) => ({ kind: "ticket_types" as const, index })),
    ...(values.modules?.meals === true ? (values.meals?.options ?? []).map((_, index) => ({ kind: "meals" as const, index })) : []),
    ...(values.modules?.accommodation === true ? (values.accommodation?.options ?? []).map((_, index) => ({ kind: "accommodation" as const, index })) : []),
  ];
  return candidates.find((source) => sourceAvailable(values, policy, source) && eventCurrencyForSource(values, source))
    ?? candidates.find((source) => sourceAvailable(values, policy, source))
    ?? null;
}

/** Reads the currency value owned by a source without using identifiers as visible data. */
export function eventCurrencyForSource(values: CreateEventFormValues, source: EventCurrencySource | null): string {
  if (!source) return "";
  if (source.kind === "base") return values.currency.trim();
  if (source.kind === "ticket_types") return values.ticket_types[source.index]?.currency?.trim() ?? "";
  if (source.kind === "meals") return values.meals?.options?.[source.index]?.currency?.trim() ?? "";
  return values.accommodation?.options?.[source.index]?.currency?.trim() ?? "";
}

/** Returns the currency shown by a dependent option control. */
export function resolveEventOptionCurrency(optionCurrency: string | null | undefined, eventCurrency: string | null | undefined): string {
  return optionCurrency?.trim() || eventCurrency?.trim() || "";
}

/** Returns the first direct currency edit represented by a form update. */
export function findEventCurrencyChange(previous: CreateEventFormValues, next: CreateEventFormValues): { source: EventCurrencySource; value: string } | null {
  if (previous.currency !== next.currency) return { source: { kind: "base" }, value: next.currency.trim() };
  const collections: Array<[EventCurrencySource["kind"], readonly { currency?: string | null }[], readonly { currency?: string | null }[]]> = [
    ["ticket_types", previous.ticket_types, next.ticket_types],
    ["meals", previous.meals?.options ?? [], next.meals?.options ?? []],
    ["accommodation", previous.accommodation?.options ?? [], next.accommodation?.options ?? []],
  ];
  for (const [kind, previousItems, nextItems] of collections) {
    const length = Math.max(previousItems.length, nextItems.length);
    for (let index = 0; index < length; index += 1) {
      if ((previousItems[index]?.currency ?? "") !== (nextItems[index]?.currency ?? "")) {
        return { source: { kind, index } as EventCurrencySource, value: nextItems[index]?.currency?.trim() ?? "" };
      }
    }
  }
  return null;
}

function sameSource(left: EventCurrencySource | null, right: EventCurrencySource | null): boolean {
  if (!left || !right || left.kind !== right.kind) return false;
  return left.kind === "base" || ("index" in right && left.index === right.index);
}

function patchCollectionCurrency(values: CreateEventFormValues, kind: "ticket_types" | "meals" | "accommodation", currency: string): CreateEventFormValues {
  if (kind === "ticket_types") return { ...values, ticket_types: values.ticket_types.map((item) => ({ ...item, currency })) };
  if (kind === "meals") return values.meals ? { ...values, meals: { ...values.meals, options: (values.meals.options ?? []).map((item) => ({ ...item, currency })) } } : values;
  return values.accommodation ? { ...values, accommodation: { ...values.accommodation, options: (values.accommodation.options ?? []).map((item) => ({ ...item, currency })) } } : values;
}

/** Synchronizes every active currency-bearing field to the authoritative currency. */
export function synchronizeEventCurrencies(values: CreateEventFormValues, policy: EventCurrencyPolicy, currency: string): CreateEventFormValues {
  let next = { ...values, currency: policy.baseEnabled && values.pricing_type === "paid" ? currency : values.currency };
  if (policy.ticketTypesEnabled && next.pricing_type === "paid" && next.modules?.tickets !== false) next = patchCollectionCurrency(next, "ticket_types", currency);
  if (policy.mealsEnabled && next.modules?.meals === true) next = patchCollectionCurrency(next, "meals", currency);
  if (policy.accommodationEnabled && next.modules?.accommodation === true) next = patchCollectionCurrency(next, "accommodation", currency);
  return next;
}

/** Clears monetary amounts before a currency switch; no conversion is attempted. */
export function resetEventMonetaryValues(values: CreateEventFormValues, policy: EventCurrencyPolicy): CreateEventFormValues {
  let next = { ...values, price: policy.baseEnabled && values.pricing_type === "paid" ? "" : values.price };
  if (policy.ticketTypesEnabled && next.pricing_type === "paid" && next.modules?.tickets !== false) next = { ...next, ticket_types: next.ticket_types.map((item) => ({ ...item, price: "" })) };
  if (policy.mealsEnabled && next.modules?.meals === true && next.meals) next = { ...next, meals: { ...next.meals, options: (next.meals.options ?? []).map((item) => ({ ...item, price: "" })) } };
  if (policy.accommodationEnabled && next.modules?.accommodation === true && next.accommodation) next = { ...next, accommodation: { ...next.accommodation, options: (next.accommodation.options ?? []).map((item) => ({ ...item, price: "" })) } };
  return next;
}

/** Indicates whether switching currency would discard a populated monetary amount. */
export function hasEventMonetaryValues(values: CreateEventFormValues, policy: EventCurrencyPolicy): boolean {
  if (policy.baseEnabled && values.pricing_type === "paid" && values.price.trim()) return true;
  if (policy.ticketTypesEnabled && values.pricing_type === "paid" && values.modules?.tickets !== false && values.ticket_types.some((item) => Boolean(item.price?.trim()))) return true;
  if (policy.mealsEnabled && values.modules?.meals === true && values.meals?.options?.some((item) => Boolean(item.price?.trim()))) return true;
  return policy.accommodationEnabled && values.modules?.accommodation === true && Boolean(values.accommodation?.options?.some((item) => Boolean(item.price?.trim())));
}

/** Validates the active create payload without changing the backend contract. */
export function validateEventCurrencies(values: CreateEventFormValues, policy: EventCurrencyPolicy): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (values.pricing_type === "free") return errors;
  const entries: Array<{ key: string; currency: string; hasValue: boolean }> = [];
  if (policy.baseEnabled && values.pricing_type === "paid") entries.push({ key: "currency", currency: values.currency.trim(), hasValue: true });
  if (policy.ticketTypesEnabled && values.pricing_type === "paid" && values.modules?.tickets !== false) values.ticket_types.forEach((item, index) => entries.push({ key: `ticket_types.${index}.currency`, currency: item.currency?.trim() ?? "", hasValue: Boolean(item.name.trim() || item.price?.trim() || item.capacity?.trim()) }));
  if (policy.mealsEnabled && values.modules?.meals === true) (values.meals?.options ?? []).forEach((item, index) => entries.push({ key: `meals.${index}.currency`, currency: item.currency?.trim() ?? "", hasValue: Boolean(item.name.trim() || item.price?.trim()) }));
  if (policy.accommodationEnabled && values.modules?.accommodation === true) (values.accommodation?.options ?? []).forEach((item, index) => entries.push({ key: `accommodation.${index}.currency`, currency: item.currency?.trim() ?? "", hasValue: Boolean(item.name.trim() || item.price?.trim()) }));
  const expected = entries.find((entry) => entry.currency)?.currency ?? "";
  if (!expected && entries.some((entry) => entry.hasValue)) errors.currency = ["Select a currency for all Event prices."];
  for (const entry of entries) {
    if (!entry.hasValue && !entry.currency) continue;
    if (!entry.currency) errors[entry.key.split(".")[0]] = ["Select a currency for this Event price."];
    else if (expected && entry.currency !== expected) errors[entry.key.split(".")[0]] = [EVENT_CURRENCY_MISMATCH_ERROR];
  }
  return errors;
}

/** Throws the same safe validation error used by the create payload builder. */
export function assertEventCurrencyConsistency(values: CreateEventFormValues, policy: EventCurrencyPolicy): void {
  const errors = validateEventCurrencies(values, policy);
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0][0]);
}

/** Reports whether a direct edit targets the current authoritative source. */
export function isEventCurrencySource(source: EventCurrencySource | null, candidate: EventCurrencySource): boolean {
  return sameSource(source, candidate);
}
