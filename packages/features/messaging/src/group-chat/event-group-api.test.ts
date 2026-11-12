import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEventGroupCreatePayload,
  buildInviteRegisteredPayload,
  normalizeEventGroupAttendeesResponse,
  normalizeEventGroupEventsResponse,
  normalizeEventGroupProvidersResponse,
} from "./event-group.models.ts";
import { createEventGroupApiClient, EventGroupApiError } from "./event-group.service.ts";
import { eventGroupQueryKeys } from "./event-group.queries.ts";
import type { EventGroupApiRequest } from "./event-group.types.ts";

const eventId = "550e8400-e29b-41d4-a716-446655440010";
const groupId = "550e8400-e29b-41d4-a716-446655440011";
const userId = "550e8400-e29b-41d4-a716-446655440012";

const validEvent = {
  id: eventId,
  title: "Wellness Summit",
  status: "published",
  delivery_mode: "online",
  start_date: "2026-10-01T09:00:00Z",
  end_date: "2026-10-01T10:00:00Z",
  registered_count: 12,
  group_count: 2,
  can_create_group: true,
  reason: null,
};

const validGroup = {
  id: groupId,
  name: "Summit discussion",
  kind: "program",
  description: null,
  avatar_url: null,
  context_type: "event",
  context_id: eventId,
  context_name: "Wellness Summit",
  tenant_id: null,
  status: "open",
  admins_only_posting: false,
  created_by: userId,
  created_at: "2026-09-01T09:00:00Z",
  member_count: 1,
  visibility_notice: "1 person can see this",
  emergency_notice: { text: "Emergency", number: "112" },
  limits: { max_members: 50, max_admins: 5, edit_window_minutes: 15 },
  permissions: null,
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

test("Event Group contract exposes the expected query keys", () => {
  assert.deepEqual(eventGroupQueryKeys.events({ q: "summit", status: "published", page: 2, pageSize: 20 }), ["event-group", "events", "summit", "published", 2, 20]);
  assert.deepEqual(eventGroupQueryKeys.attendees(eventId, { eligibleOnly: false, registrationStatus: "confirmed", paymentStatus: "paid", notInGroup: true, groupId, page: 2, pageSize: 50 }), ["event-group", "attendees", eventId, "", false, "confirmed", "paid", true, groupId, 2, 50]);
  assert.deepEqual(eventGroupQueryKeys.providers(eventId, { q: "provider" }), ["event-group", "providers", eventId, "provider"]);
  assert.deepEqual(eventGroupQueryKeys.groups(eventId), ["event-group", "groups", eventId]);
});

test("GET /groups/events serializes the documented query parameters and normalizes pagination", async () => {
  let capturedPath = "";
  const request: EventGroupApiRequest = async (path) => { capturedPath = path; return jsonResponse({ items: [validEvent], total: 1, page: 2, page_size: 20 }); };
  const result = await createEventGroupApiClient(request).listEvents({ q: "  summit ", status: "published", page: 2, pageSize: 20 });
  assert.equal(capturedPath, "/groups/events?q=summit&status=published&page=2&page_size=20");
  assert.equal(result.items[0]?.can_create_group, true);
  assert.deepEqual(result, { items: [validEvent], total: 1, page: 2, page_size: 20 });
});

test("GET /groups/events/{event_id}/attendees serializes every filter and preserves nullable identity", async () => {
  let capturedPath = "";
  const request: EventGroupApiRequest = async (path) => {
    capturedPath = path;
    return jsonResponse({
      event_id: eventId,
      event_title: null,
      event_status: "published",
      items: [{ registration_id: "registration-1", name: null, email: "person@example.test", registration_status: "confirmed", payment_status: "free", user_id: null, can_invite: false, reason: "no_account", group_state: "none", group_ids: [], registered_at: null }],
      total: 1,
      page: 1,
      page_size: 50,
      eligible_total: 0,
      walk_in_excluded: 3,
      max_members: 50,
    });
  };
  const result = await createEventGroupApiClient(request).listAttendees(eventId, { q: "person", eligibleOnly: false, registrationStatus: "confirmed", paymentStatus: "free", notInGroup: true, groupId, page: 1, pageSize: 50 });
  assert.equal(capturedPath, `/groups/events/${eventId}/attendees?q=person&eligible_only=false&registration_status=confirmed&payment_status=free&not_in_group=true&group_id=${groupId}&page=1&page_size=50`);
  assert.equal(result.items[0]?.user_id, null);
  assert.equal(result.items[0]?.email, "person@example.test");
  assert.equal(result.walk_in_excluded, 3);
});

test("GET providers and event groups use the authenticated Group gateway routes", async () => {
  const paths: string[] = [];
  const request: EventGroupApiRequest = async (path) => {
    paths.push(path);
    if (path.includes("/providers")) return jsonResponse({ event_id: eventId, items: [{ user_id: userId, name: null, registration_number: null, is_me: false }], total: 1 });
    return jsonResponse({ items: [validGroup], total: 1 });
  };
  const client = createEventGroupApiClient(request);
  const providers = await client.listProviders(eventId, { q: "provider" });
  const groups = await client.listGroups(eventId);
  assert.deepEqual(paths, [`/groups/events/${eventId}/providers?q=provider`, `/groups/events/${eventId}/groups`]);
  assert.equal(providers.items[0]?.user_id, userId);
  assert.equal(groups.items[0]?.context_type, "event");
  assert.equal(groups.items[0]?.limits.max_members, 50);
});

test("POST /groups uses an Event context and never uses registration_id as an invite identity", async () => {
  let capturedInit: RequestInit | undefined;
  const request: EventGroupApiRequest = async (_path, init) => { capturedInit = init; return jsonResponse(validGroup, 201); };
  await createEventGroupApiClient(request).createGroup(buildEventGroupCreatePayload({ name: " Summit chat ", contextId: eventId, invitees: [{ user_id: ` ${userId} ` }], description: " Discussion " }));
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), { name: "Summit chat", kind: "program", context_type: "event", context_id: eventId, description: "Discussion", invitees: [{ user_id: userId }] });
  assert.equal(String(capturedInit?.body).includes("registration"), false);
});

test("POST invite-registered sends the exact payload and normalizes capacity outcomes", async () => {
  let capturedPath = "";
  let capturedBody = "";
  const request: EventGroupApiRequest = async (path, init) => { capturedPath = path; capturedBody = String(init?.body); return jsonResponse({ invited: [userId], skipped: [], not_invited_group_full: 2, no_account: 1, free_places: 4 }, 201); };
  const excludedUserId = "550e8400-e29b-41d4-a716-446655440013";
  const result = await createEventGroupApiClient(request).inviteRegistered(groupId, buildInviteRegisteredPayload({ user_ids: [userId, ` ${userId} `], all_eligible: true, exclude_user_ids: [excludedUserId] }));
  assert.equal(capturedPath, `/groups/${groupId}/members/invite-registered`);
  assert.deepEqual(JSON.parse(capturedBody), { user_ids: [userId], all_eligible: true, exclude_user_ids: [excludedUserId] });
  assert.deepEqual(result, { invited: [userId], skipped: [], not_invited_group_full: 2, no_account: 1, free_places: 4 });
});

test("POST invite-registered supports verified Provider-only invitations through the Event endpoint", async () => {
  let capturedPath = "";
  let capturedBody = "";
  const request: EventGroupApiRequest = async (path, init) => { capturedPath = path; capturedBody = String(init?.body); return jsonResponse({ invited: [userId], skipped: [], free_places: 3 }, 201); };
  const result = await createEventGroupApiClient(request).inviteRegistered(groupId, buildInviteRegisteredPayload({ user_ids: [userId] }));
  assert.equal(capturedPath, `/groups/${groupId}/members/invite-registered`);
  assert.deepEqual(JSON.parse(capturedBody), { user_ids: [userId] });
  assert.deepEqual(result, { invited: [userId], skipped: [], not_invited_group_full: 0, no_account: 0, free_places: 3 });
});

test("POST invite-registered supports mixed attendee and verified Provider identities", async () => {
  let capturedPath = "";
  let capturedBody = "";
  const providerId = "550e8400-e29b-41d4-a716-446655440014";
  const request: EventGroupApiRequest = async (path, init) => {
    capturedPath = path;
    capturedBody = String(init?.body);
    return jsonResponse({ invited: [userId, providerId], skipped: [], free_places: 2 }, 201);
  };
  const result = await createEventGroupApiClient(request).inviteRegistered(groupId, buildInviteRegisteredPayload({ user_ids: [userId, providerId] }));
  assert.equal(capturedPath, `/groups/${groupId}/members/invite-registered`);
  assert.deepEqual(JSON.parse(capturedBody), { user_ids: [userId, providerId] });
  assert.deepEqual(result, { invited: [userId, providerId], skipped: [], not_invited_group_full: 0, no_account: 0, free_places: 2 });
});

test("invite-registered rejects empty or invalid platform identity payloads before making a request", async () => {
  let requestCount = 0;
  const request: EventGroupApiRequest = async () => { requestCount += 1; return jsonResponse({ invited: [], free_places: 0 }, 201); };
  const client = createEventGroupApiClient(request);
  await assert.rejects(() => client.inviteRegistered(groupId, buildInviteRegisteredPayload({ user_ids: [] })), (error: unknown) => error instanceof EventGroupApiError && error.status === 422);
  await assert.rejects(() => client.inviteRegistered(groupId, buildInviteRegisteredPayload({ user_ids: ["provider-not-a-uuid"] })), (error: unknown) => error instanceof EventGroupApiError && error.status === 422);
  assert.equal(requestCount, 0);
});

test("normalizers fail closed for missing required fields while preserving eligibility reasons", () => {
  const attendees = normalizeEventGroupAttendeesResponse({ event_id: eventId, items: [{ registration_id: "r1", user_id: null, can_invite: false, reason: "payment_pending", group_state: "declined", group_ids: [] }], total: 1, page: 1, page_size: 50, eligible_total: 0, walk_in_excluded: 1, max_members: 50 });
  assert.equal(attendees?.items[0]?.reason, "payment_pending");
  assert.equal(attendees?.items[0]?.user_id, null);
  assert.equal(normalizeEventGroupEventsResponse({ items: [], total: 0, page: 1 }), null);
  assert.equal(normalizeEventGroupProvidersResponse({ items: [], total: 0 }), null);
  assert.equal(normalizeEventGroupProvidersResponse({ event_id: eventId, items: [{ user_id: "provider-not-a-uuid", name: "Unverified" }], total: 1 })?.items.length, 0);
});

test("HTTP failures retain status and do not silently succeed", async () => {
  const request: EventGroupApiRequest = async () => jsonResponse({ detail: "Forbidden" }, 403);
  await assert.rejects(() => createEventGroupApiClient(request).listEvents(), (error: unknown) => error instanceof EventGroupApiError && error.status === 403 && error.message === "Forbidden");
});
