import assert from "node:assert/strict";
import test from "node:test";

import { isActiveEventFormConfiguration, normalizeEventFormContract } from "./event-form-configuration-normalizer.ts";

function capturedField(sectionIndex: number, fieldIndex: number, stableKey: string) {
  return {
    id: `field-${sectionIndex}-${fieldIndex}`,
    key: stableKey,
    label: stableKey,
    type: stableKey === "primary_image" ? "image" : "text",
    renderer: stableKey === "primary_image" ? "image_uploader" : stableKey === "ticket_types" ? "ticket_type_list" : stableKey === "sessions" ? "session_list" : "text_input",
    visibility: "published",
    required: stableKey === "primary_image",
    options: [],
  };
}

function capturedResponse() {
  const sections = Array.from({ length: 7 }, (_, sectionIndex) => ({
    id: `section-${sectionIndex + 1}`,
    key: `section_${sectionIndex + 1}`,
    title: `Section ${sectionIndex + 1}`,
    fields: Array.from({ length: sectionIndex === 6 ? 1 : 3 }, (_, fieldIndex) => capturedField(
      sectionIndex + 1,
      fieldIndex + 1,
      sectionIndex === 0 && fieldIndex === 0 ? "primary_image" : sectionIndex === 0 && fieldIndex === 1 ? "ticket_types" : sectionIndex === 0 && fieldIndex === 2 ? "sessions" : `field_${sectionIndex + 1}_${fieldIndex + 1}`,
    )),
  }));

  return {
    configuration_id: "11111111-1111-4111-8111-111111111111",
    name: "event forms",
    scope: "global",
    audience: "enterprise_admin",
    version_id: "22222222-2222-4222-8222-222222222222",
    version: 1,
    status: null,
    is_active: null,
    version_status: null,
    published_at: null,
    definition: { sections },
  };
}

test("normalizes the active-common definition envelope with nullable lifecycle metadata", () => {
  const normalized = normalizeEventFormContract(capturedResponse());
  assert.ok(isActiveEventFormConfiguration(normalized));

  assert.equal(normalized.sections.length, 7);
  assert.equal(normalized.sections.reduce((total, section) => total + section.fields.length, 0), 19);
  assert.equal(normalized.sections[0]?.fields[0]?.stable_key, "primary_image");
  assert.equal(normalized.sections[0]?.fields[0]?.renderer, "media_upload");
  assert.equal(normalized.sections[0]?.fields[0]?.composite_config?.frontend_settings?.content_visibility, "published");
  assert.equal(normalized.sections[0]?.fields[0]?.source, "core");
  assert.equal(normalized.sections[0]?.fields[1]?.core_key, "ticket_types");
  assert.equal(normalized.sections[0]?.fields[1]?.renderer, "ticket_types");
  assert.equal(normalized.sections[0]?.fields[2]?.core_key, "sessions");
  assert.equal(normalized.sections[0]?.fields[2]?.renderer, "sessions");

  const metadata = normalized as unknown as Record<string, unknown>;
  assert.equal(metadata.status, null);
  assert.equal(metadata.is_active, null);
  assert.equal(metadata.version_status, null);
  assert.equal(metadata.published_at, null);
});

test("does not accept an unrelated response without a sections envelope", () => {
  const normalized = normalizeEventFormContract({ configuration_id: "configuration-1" });
  assert.equal(isActiveEventFormConfiguration(normalized), false);
});

test("canonicalizes the backend Event currency key for pricing validation", () => {
  const normalized = normalizeEventFormContract({
    configuration_id: "configuration-1",
    version_id: "version-1",
    name: "Event form",
    scope: "global",
    version: 1,
    definition: { sections: [{ key: "pricing", fields: [{ id: "currency-1", key: "event_currency", label: "Event currency", type: "text", required: true }] }] },
  });
  assert.ok(isActiveEventFormConfiguration(normalized));
  assert.equal(normalized.sections[0]?.fields[0]?.source, "core");
  assert.equal(normalized.sections[0]?.fields[0]?.core_key, "currency");
  assert.equal(normalized.sections[0]?.fields[0]?.stable_key, "currency");
});

test("preserves explicit custom fields even when their keys overlap Event core fields", () => {
  const keys = ["price", "title", "currency", "capacity"];
  const normalized = normalizeEventFormContract({
    configuration_id: "configuration-1",
    version_id: "version-1",
    name: "Event form",
    scope: "global",
    version: 1,
    definition: { sections: [{ key: "custom", fields: keys.map((key) => ({ id: `custom-${key}`, key, source: "custom", renderer: "custom_widget", label: `Custom ${key}`, value: `custom-${key}` })) }] },
  });
  assert.ok(isActiveEventFormConfiguration(normalized));
  for (const key of keys) {
    const field = normalized.sections[0]?.fields.find((item) => item.id === `custom-${key}`);
    assert.equal(field?.source, "custom");
    assert.equal(field?.core_key, null);
    assert.equal(field?.stable_key, key);
    assert.equal(field?.renderer, "custom_widget");
  }
});

test("preserves explicit core fields and infers core fields only without source metadata", () => {
  const normalized = normalizeEventFormContract({
    configuration_id: "configuration-1",
    version_id: "version-1",
    name: "Event form",
    scope: "global",
    version: 1,
    definition: { sections: [{ key: "fields", fields: [
      { id: "explicit-core", key: "price", source: "core", renderer: "text_input", label: "Price" },
      { id: "inferred-core", key: "capacity", renderer: "text_input", label: "Capacity" },
      { id: "system-core", key: "internal_value", system: true, renderer: "text_input", label: "Internal value" },
      { id: "explicit-custom-system", key: "capacity", source: "custom", system: true, renderer: "custom_widget", label: "Custom capacity" },
    ] }] },
  });
  assert.ok(isActiveEventFormConfiguration(normalized));
  const fields = normalized.sections[0]?.fields ?? [];
  assert.equal(fields.find((field) => field.id === "explicit-core")?.source, "core");
  assert.equal(fields.find((field) => field.id === "explicit-core")?.core_key, "price");
  assert.equal(fields.find((field) => field.id === "inferred-core")?.source, "core");
  assert.equal(fields.find((field) => field.id === "inferred-core")?.core_key, "capacity");
  assert.equal(fields.find((field) => field.id === "system-core")?.source, "core");
  assert.equal(fields.find((field) => field.id === "explicit-custom-system")?.source, "custom");
});
