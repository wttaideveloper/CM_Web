import assert from "node:assert/strict";
import test from "node:test";

import { buildEventTemplateData } from "./event-template-data.ts";
import type { Event } from "./events.service.ts";

function sourceEvent(pricingType: "free" | "paid"): Event {
  return {
    id: "event-1",
    tenant_id: "tenant-1",
    enterprise_id: "enterprise-1",
    location_id: null,
    title: "Wellness Event",
    description: "Event description",
    category: "Wellness",
    subcategory: "Fitness",
    tags: [],
    organiser_name: "Organizer",
    organiser_contact: "organizer@example.com",
    start_date: "2026-10-08T10:00:00",
    end_date: "2026-10-08T12:00:00",
    duration_type: "custom",
    time_zone: "America/New_York",
    registration_cutoff: "",
    primary_image: "",
    gallery_images: [],
    videos: [],
    documents: [],
    delivery_mode: "in_person",
    venue: null,
    meeting_link: null,
    meeting_provider: null,
    price: pricingType === "paid" ? "125" : null,
    pricing_type: pricingType,
    currency: "USD",
    ticket_types: pricingType === "paid" ? [{ id: "ticket-1", name: "General", price: "125", currency: "USD", capacity: "20" }] : [],
    capacity: "20",
    min_participants: "",
    max_participants: "",
    registration_open_at: "",
    registration_close_at: "",
    available_seats: null,
    is_full: null,
    custom_fields: [],
    sessions: [],
    status: "draft",
    lifecycle_state: null,
    is_deleted: false,
    created_at: "2026-10-08T00:00:00Z",
    updated_at: "2026-10-08T00:00:00Z",
    enterprise_name: "Example Enterprise",
    last_admin_notes: null,
  };
}

test("preserves authoritative paid pricing in Event template data", () => {
  const data = buildEventTemplateData(sourceEvent("paid"));
  const applyCompatibleData = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  assert.equal(data.pricing_type, "paid");
  assert.equal(applyCompatibleData.pricing_type, "paid");
  assert.equal(data.price, "125");
  assert.equal(data.currency, "USD");
  assert.deepEqual(data.ticket_types, [{ id: "ticket-1", name: "General", price: "125", currency: "USD", capacity: "20" }]);
});

test("preserves authoritative free pricing in Event template data", () => {
  const data = buildEventTemplateData(sourceEvent("free"));

  assert.equal(data.pricing_type, "free");
  assert.equal(data.price, null);
  assert.equal(data.currency, "USD");
  assert.deepEqual(data.ticket_types, []);
});
