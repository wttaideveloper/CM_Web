import assert from "node:assert/strict";
import test from "node:test";

import type { CreateEventFormValues } from "./create-event-form.ts";
import { assertEventCurrencyConsistency, EVENT_CURRENCY_MISMATCH_ERROR, getEventCurrencyPolicy, hasEventMonetaryValues, resetEventMonetaryValues, resolveEventCurrencySource, resolveEventOptionCurrency, resolveNewEventCurrency, synchronizeEventCurrencies, validateEventCurrencies, type EventCurrencyPolicy } from "./event-currency.ts";
import type { ActiveEventFormConfiguration } from "./events.service.ts";

function form(overrides: Partial<CreateEventFormValues> = {}): CreateEventFormValues {
  return { currency: "", price: "", pricing_type: "paid", ticket_types: [], modules: null, meals: null, accommodation: null, ...overrides } as CreateEventFormValues;
}

function configuration(fields: Array<Record<string, unknown>>, sectionEnabled = true): ActiveEventFormConfiguration {
  return {
    configuration_id: "configuration-1",
    version_id: "version-1",
    name: "Test form",
    scope: "global",
    version: 1,
    sections: [{ id: "section-1", stable_key: "pricing", label: "Pricing", description: null, position: 1, is_enabled: sectionEnabled, fields: fields.map((field, index) => ({
      id: `field-${index}`,
      source: "core",
      core_key: String(field.core_key ?? ""),
      stable_key: null,
      label: String(field.core_key ?? "Field"),
      renderer: String(field.renderer ?? "text"),
      value_type: "text",
      required: false,
      position: index,
      is_enabled: field.is_enabled as boolean | undefined,
      placeholder: null,
      help_text: null,
      options: [],
      validation: {},
      composite_config: field.composite_config as null,
    })) }],
  };
}

const fullPolicy: EventCurrencyPolicy = { baseEnabled: true, ticketTypesEnabled: true, mealsEnabled: true, accommodationEnabled: true };

test("base currency is authoritative and synchronizes tickets and services", () => {
  const values = form({
    currency: "USD",
    price: "100",
    ticket_types: [{ id: "", name: "General", price: "50", currency: "USD", capacity: "10" }],
    modules: { registration: true, tickets: true, sessions: true, check_in: true, online_meeting: false, custom_questions: false, meals: true, accommodation: true },
    meals: { options: [{ name: "Lunch", price: "10", currency: "USD" }] },
    accommodation: { options: [{ name: "Room", price: "20", currency: "USD" }] },
  });
  const next = synchronizeEventCurrencies(values, fullPolicy, "INR");
  assert.equal(next.currency, "INR");
  assert.equal(next.ticket_types[0].currency, "INR");
  assert.equal(next.meals?.options?.[0].currency, "INR");
  assert.equal(next.accommodation?.options?.[0].currency, "INR");
});

test("dependent option controls display the Event currency when their row is empty", () => {
  assert.equal(resolveEventOptionCurrency("", "THB"), "THB");
  assert.equal(resolveEventOptionCurrency("  ", "THB"), "THB");
  assert.equal(resolveEventOptionCurrency(null, "USD"), "USD");
  assert.equal(resolveEventOptionCurrency("INR", "THB"), "INR");
});

test("new rows use the current edit Event currency without changing existing rows", () => {
  assert.equal(resolveNewEventCurrency(" THB "), "THB");
  assert.equal(resolveNewEventCurrency("USD", { value: "INR" }), "INR");
  assert.equal(resolveNewEventCurrency("", undefined), "");
});

test("explicit currency synchronization preserves option identifiers", () => {
  const values = form({
    currency: "USD",
    price: "100",
    ticket_types: [{ id: "ticket-1", name: "VIP", price: "50", currency: "USD", capacity: "10" }],
    modules: { registration: true, tickets: true, sessions: true, check_in: true, online_meeting: false, custom_questions: false, meals: true, accommodation: true },
    meals: { options: [{ id: "meal-1", name: "Lunch", price: "10", currency: "USD" }] },
    accommodation: { options: [{ id: "room-1", name: "Room", price: "20", currency: "USD" }] },
  });
  const synchronized = synchronizeEventCurrencies(values, fullPolicy, "INR");
  assert.equal(synchronized.ticket_types[0].id, "ticket-1");
  assert.equal(synchronized.meals?.options?.[0].id, "meal-1");
  assert.equal(synchronized.accommodation?.options?.[0].id, "room-1");
  assert.equal(synchronized.ticket_types[0].currency, "INR");
  assert.equal(synchronized.meals?.options?.[0].currency, "INR");
  assert.equal(synchronized.accommodation?.options?.[0].currency, "INR");
});

test("currency reset clears active prices but leaves disabled modules unchanged", () => {
  const values = form({
    currency: "USD",
    price: "100",
    ticket_types: [{ id: "ticket-1", name: "VIP", price: "50", currency: "USD", capacity: "10" }],
    modules: { registration: true, tickets: true, sessions: true, check_in: true, online_meeting: false, custom_questions: false, meals: false, accommodation: true },
    meals: { options: [{ id: "meal-1", name: "Lunch", price: "10", currency: "USD" }] },
    accommodation: { options: [{ id: "room-1", name: "Room", price: "20", currency: "USD" }] },
  });
  const reset = resetEventMonetaryValues(values, fullPolicy);
  assert.equal(reset.price, "");
  assert.equal(reset.ticket_types[0].price, "");
  assert.equal(reset.accommodation?.options?.[0].price, "");
  assert.equal(reset.meals?.options?.[0].price, "10");
  assert.equal(reset.ticket_types[0].id, "ticket-1");
  assert.equal(reset.meals?.options?.[0].id, "meal-1");
  assert.equal(reset.accommodation?.options?.[0].id, "room-1");
});

test("without a base field the first applicable ticket source establishes currency", () => {
  const policy: EventCurrencyPolicy = { ...fullPolicy, baseEnabled: false };
  const values = form({ currency: "", ticket_types: [{ id: "", name: "General", price: "50", currency: "INR", capacity: "10" }] });
  const source = resolveEventCurrencySource(values, policy, null);
  assert.deepEqual(source, { kind: "ticket_types", index: 0 });
  assert.equal(validateEventCurrencies(values, policy).currency, undefined);
  const synced = synchronizeEventCurrencies(values, policy, "INR");
  assert.equal(synced.ticket_types[0].currency, "INR");
  assert.equal(synced.currency, "");
});

test("a selected meal or accommodation currency can establish authority when no base exists", () => {
  const policy: EventCurrencyPolicy = { ...fullPolicy, baseEnabled: false };
  const values = form({ currency: "", ticket_types: [{ id: "", name: "", price: "", currency: "", capacity: "" }], modules: { registration: true, tickets: true, sessions: true, check_in: true, online_meeting: false, custom_questions: false, meals: true, accommodation: true }, meals: { options: [{ name: "Lunch", price: "10", currency: "AED" }] }, accommodation: { options: [] } });
  assert.deepEqual(resolveEventCurrencySource(values, policy, null), { kind: "meals", index: 0 });
  assert.equal(synchronizeEventCurrencies(values, policy, "AED").ticket_types[0].currency, "AED");
});

test("removing the preferred source transfers authority without resetting currency", () => {
  const policy: EventCurrencyPolicy = { ...fullPolicy, baseEnabled: false };
  const values = form({ currency: "", ticket_types: [{ id: "", name: "First", price: "", currency: "USD", capacity: "" }, { id: "", name: "Second", price: "", currency: "USD", capacity: "" }] });
  assert.deepEqual(resolveEventCurrencySource({ ...values, ticket_types: values.ticket_types.slice(1) }, policy, { kind: "ticket_types", index: 0 }), { kind: "ticket_types", index: 0 });
});

test("currency changes reset prices only after confirmation is accepted", () => {
  const values = form({ currency: "USD", price: "100", ticket_types: [{ id: "", name: "General", price: "50", currency: "USD", capacity: "10" }] });
  assert.equal(hasEventMonetaryValues(values, fullPolicy), true);
  const reset = resetEventMonetaryValues(values, fullPolicy);
  assert.equal(reset.price, "");
  assert.equal(reset.ticket_types[0].price, "");
  assert.equal(reset.ticket_types[0].name, "General");
  assert.equal(values.price, "100");
});

test("mixed active currencies are rejected for the create payload", () => {
  const values = form({ currency: "USD", price: "100", ticket_types: [{ id: "", name: "General", price: "50", currency: "INR", capacity: "10" }] });
  assert.equal(validateEventCurrencies(values, fullPolicy).ticket_types[0], EVENT_CURRENCY_MISMATCH_ERROR);
  assert.throws(() => assertEventCurrencyConsistency(values, fullPolicy), /selected Event currency/);
});

test("configuration order and disabled fields do not create a currency source", () => {
  const policy = getEventCurrencyPolicy(configuration([
    { core_key: "ticket_types", renderer: "ticket_types", composite_config: { enabled_fields: ["name", "price"] } },
    { core_key: "currency", is_enabled: false },
  ]));
  assert.equal(policy.baseEnabled, false);
  assert.equal(policy.ticketTypesEnabled, false);
});

test("free Events do not require or synthesize a currency", () => {
  const values = form({ pricing_type: "free", currency: "", price: "", ticket_types: [] });
  assert.deepEqual(resolveEventCurrencySource(values, fullPolicy, null), null);
  assert.deepEqual(validateEventCurrencies(values, fullPolicy), {});
});
