import assert from "node:assert/strict";
import { test } from "node:test";

import type { CreateEventFormValues } from "./create-event-form.ts";
import type { ActiveEventFormConfiguration, ActiveEventFormField } from "./events.service.ts";
import { validateRequiredConfiguredEventFields } from "./configured-event-required-fields.ts";

const emptyValues: CreateEventFormValues = {
  title: "",
  description: "",
  category: "",
  subcategory: "",
  tags: [],
  organiser_name: "",
  organiser_contact: "",
  start_date: "",
  end_date: "",
  duration_type: "",
  registration_cutoff: "",
  registration_open_at: "",
  registration_close_at: "",
  time_zone: "Asia/Kolkata",
  event_type: "",
  delivery_mode: "in_person",
  venue_name: "",
  venue_address: "",
  venue_city: "",
  venue_latitude: "",
  venue_longitude: "",
  meeting_link: "",
  meeting_provider: "",
  price: "",
  pricing_type: "paid",
  currency: "",
  ticket_types: [],
  capacity: "",
  min_participants: "",
  max_participants: "",
  primary_image: "",
  gallery_images: [],
  videos: [],
  documents: [],
  custom_fields: [],
  sessions: [],
  modules: null,
  meals: null,
  accommodation: null,
};

function field(overrides: Partial<ActiveEventFormField> & Pick<ActiveEventFormField, "core_key" | "source" | "stable_key">): ActiveEventFormField {
  return {
    id: overrides.id ?? "field-1",
    core_key: overrides.core_key,
    source: overrides.source,
    stable_key: overrides.stable_key,
    label: overrides.label ?? "Field",
    renderer: overrides.renderer ?? "text",
    value_type: overrides.value_type ?? "string",
    required: overrides.required ?? true,
    position: overrides.position ?? 1,
    is_enabled: overrides.is_enabled ?? true,
    placeholder: null,
    help_text: null,
    options: [],
    validation: {},
    composite_config: overrides.composite_config ?? null,
  };
}

function configuration(...fields: ActiveEventFormField[]): ActiveEventFormConfiguration {
  return {
    configuration_id: "configuration-1",
    version_id: "version-1",
    name: "Event form",
    scope: "global",
    version: 1,
    sections: [{
      id: "section-1",
      stable_key: "details",
      label: "Details",
      description: null,
      position: 1,
      is_enabled: true,
      fields,
    }],
  };
}

test("required configured core values block submission until provided", () => {
  const title = field({ source: "core", core_key: "title", stable_key: "title", label: "Event name" });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(title), emptyValues, {}), {
    title: ["Event name is required."],
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(title), { ...emptyValues, title: "Conference" }, {}), {});
});

test("required composite fields validate parent and configured venue subfields", () => {
  const venue = field({
    source: "core",
    core_key: "venue",
    stable_key: "venue",
    label: "Venue",
    renderer: "venue",
    composite_config: { enabled_fields: ["name", "city"], required_fields: ["name", "city"] },
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(venue), emptyValues, {}), {
    venue: ["Venue is required."],
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(venue), { ...emptyValues, venue_name: "Hall" }, {}), {
    venue: ["Venue: city is required."],
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(venue), { ...emptyValues, venue_name: "Hall", venue_city: "Pune" }, {}), {});
});

test("required ticket collections reject empty lists and incomplete configured rows", () => {
  const tickets = field({
    source: "core",
    core_key: "ticket_types",
    stable_key: "ticket_types",
    label: "Tickets",
    renderer: "ticket_types",
    composite_config: { enabled_fields: ["name", "price"], required_fields: ["name", "price"] },
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(tickets), emptyValues, {}), {
    ticket_types: ["Tickets is required."],
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(tickets), {
    ...emptyValues,
    ticket_types: [{ id: "ticket-1", name: "", price: "10", currency: "INR", capacity: "5" }],
  }, {}), {
    ticket_types: ["Tickets: name is required."],
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(tickets), {
    ...emptyValues,
    ticket_types: [{ id: "ticket-1", name: "General", price: "10", currency: "INR", capacity: "5" }],
  }, {}), {});
});

test("custom fields with a core-like key read their own value", () => {
  const customTitle = field({
    source: "custom",
    core_key: null,
    stable_key: "title",
    label: "Custom title",
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(customTitle), { ...emptyValues, title: "Core title" }, {}), {
    title: ["Custom title is required."],
  });
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(customTitle), emptyValues, { title: "Custom value" }), {});
});

test("required fields disabled by the selected Event Type do not block submission", () => {
  const tickets = field({
    source: "core",
    core_key: "ticket_types",
    stable_key: "ticket_types",
    label: "Tickets",
  });
  const values = { ...emptyValues, modules: { registration: true, tickets: false, sessions: false, check_in: false, online_meeting: false, custom_questions: false, meals: false, accommodation: false } };
  assert.deepEqual(validateRequiredConfiguredEventFields(configuration(tickets), values, {}), {});
});
