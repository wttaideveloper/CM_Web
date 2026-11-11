import assert from "node:assert/strict";
import test from "node:test";
import type { EventGroupAttendee, EventGroupProvider } from "./group-chat/event-group.types.ts";
import { buildEventGroupCreatePayload, buildInviteRegisteredPayload, validateEventGroupCreatePayload } from "./group-chat/event-group.models.ts";
import { isSupportedEventGroupAvatarFile } from "./group-chat-models.ts";
import { addEventAttendeeSelection, buildEventGroupAttendeeFilters, buildEventGroupListParams, canContinueEventGroupAttendeeStep, canManageEventGroupInvitations, eventGroupInvitationInvalidationQueryKeys, formatEventGroupAvatarFileSize, getEventAttendeeEligibilityReason, getEventAttendeeIdentityStatus, getGroupWorkspaceContextLabel, isEventGroupCreationEnabled, isEventGroupInvitationEnabled, isEventGroupWorkspaceContext, resolveEventGroupQueryState, summarizeEventGroupAttendeeEligibility, summarizeEventGroupCapacity, toggleEventAttendeeSelection, toggleEventGroupProviderSelection, validateEventGroupReview } from "./event-group-wizard-models.ts";
import { normalizeGroupChatSocketEvent } from "./group-chat/group-chat-socket.ts";
import { isGroupChatRealtimeActiveStatus } from "./group-chat/group-chat-socket-controller.ts";

const attendee = (registrationId: string, name = registrationId): EventGroupAttendee => ({
  registration_id: registrationId,
  name,
  email: `${registrationId}@example.test`,
  registration_status: "confirmed",
  payment_status: "paid",
  user_id: `user-${registrationId}`,
  can_invite: true,
  reason: null,
  group_state: "none",
  group_ids: [],
  registered_at: "2026-01-01T00:00:00Z",
});

test("Event queries retain enterprise scope and server-side filters", () => {
  assert.deepEqual(buildEventGroupListParams({ search: "  summit ", page: 2 }), {
    q: "summit", page: 2, pageSize: 10,
  });
  assert.deepEqual(buildEventGroupAttendeeFilters({ page: 3, search: "  Ada ", status: "confirmed", paymentStatus: "paid" }), {
    page: 3, pageSize: 25, q: "Ada", eligibleOnly: false, registrationStatus: "confirmed", paymentStatus: "paid", notInGroup: false,
  });
});

test("attendee selection persists across pages and deduplicates by platform user ID", () => {
  const first = attendee("registration-1", "First");
  const second = attendee("registration-2", "Second");
  const duplicateRegistration = { ...first, registration_id: "registration-3" };
  const selected = addEventAttendeeSelection(addEventAttendeeSelection(addEventAttendeeSelection({}, first), duplicateRegistration), second);
  assert.equal(Object.keys(selected).length, 2);
  assert.equal(Object.keys(addEventAttendeeSelection(selected, first)).length, 2);
  assert.deepEqual(Object.keys(toggleEventAttendeeSelection(selected, first)), ["user-registration-2"]);
});

test("registration eligibility is separate from inviteable platform accounts", () => {
  const noAccountAttendees = Array.from({ length: 5 }, (_, index) => ({ ...attendee(`registration-${index + 1}`), user_id: null, can_invite: false, reason: "no_account" as const }));
  const summary = summarizeEventGroupAttendeeEligibility({ items: noAccountAttendees, eligible_total: 5 });
  assert.deepEqual(summary, { eligibleRegistrationTotal: 5, inviteableOnPage: 0 });
  assert.equal(getEventAttendeeEligibilityReason(noAccountAttendees[0]), "no_account");
  assert.equal(getEventAttendeeEligibilityReason({ can_invite: false, reason: "payment_pending" }), "payment_pending");
});

test("attendee selection remains disabled for null identities and backend denial", () => {
  const noAccount = { ...attendee("registration-no-account"), user_id: null, can_invite: false, reason: "no_account" as const };
  assert.deepEqual(addEventAttendeeSelection({}, noAccount), {});
  assert.deepEqual(toggleEventAttendeeSelection({}, noAccount), {});
  assert.equal(getEventAttendeeIdentityStatus(noAccount), "not_invitable");
});

test("zero-attendee Event responses can continue to Provider selection", () => {
  assert.equal(canContinueEventGroupAttendeeStep({ hasResponse: true, isError: false }), true);
  assert.equal(canContinueEventGroupAttendeeStep({ hasResponse: false, isError: false }), false);
  assert.equal(canContinueEventGroupAttendeeStep({ hasResponse: true, isError: true }), false);
});

test("confirmed free registrations remain selectable only with a platform identity", () => {
  const freeWithAccount = { ...attendee("free-account"), payment_status: "free" };
  const freeWithoutAccount = { ...freeWithAccount, registration_id: "free-no-account", user_id: null, can_invite: false, reason: "no_account" as const };
  assert.equal(Object.keys(toggleEventAttendeeSelection({}, freeWithAccount)).length, 1);
  assert.deepEqual(toggleEventAttendeeSelection({}, freeWithoutAccount), {});
});

test("final review permits Admin plus Provider-only drafts without silently requiring invite-all", () => {
  const eventId = "550e8400-e29b-41d4-a716-446655440010";
  assert.equal(validateEventGroupReview({ eventId, groupName: "Provider Event Group", description: "", attendeeUserIds: [], providerUserIds: ["550e8400-e29b-41d4-a716-446655440011"], inviteAllRegistered: false, maxMembers: 50 }), null);
  assert.equal(validateEventGroupReview({ eventId, groupName: "Empty draft", description: "", attendeeUserIds: [], providerUserIds: [], inviteAllRegistered: false, maxMembers: 50 }), "invitee_required");
  assert.equal(validateEventGroupReview({ eventId, groupName: "Invite all draft", description: "", attendeeUserIds: [], providerUserIds: [], inviteAllRegistered: true, maxMembers: 50 }), null);
});

test("final review rejects duplicate platform IDs and capacity overflow", () => {
  const eventId = "550e8400-e29b-41d4-a716-446655440010";
  assert.equal(validateEventGroupReview({ eventId, groupName: "Duplicate draft", description: "", attendeeUserIds: ["550e8400-e29b-41d4-a716-446655440011"], providerUserIds: ["550e8400-e29b-41d4-a716-446655440011"], inviteAllRegistered: false, maxMembers: 50 }), "duplicate_invitee");
  assert.equal(validateEventGroupReview({ eventId, groupName: "Full draft", description: "", attendeeUserIds: [], providerUserIds: ["550e8400-e29b-41d4-a716-446655440011"], inviteAllRegistered: false, maxMembers: 1 }), "capacity_exceeded");
});

test("identity and creation remain backend-blocked", () => {
  assert.equal(getEventAttendeeIdentityStatus(attendee("registration-1")), "platform_identity_available");
  assert.equal(getEventAttendeeIdentityStatus({ ...attendee("registration-2"), user_id: null }), "pending_backend_verification");
  assert.equal(isEventGroupCreationEnabled(), false);
  assert.equal(isEventGroupInvitationEnabled(), false);
});

test("Event workspace context requires the authoritative kind, type, and ID", () => {
  assert.equal(isEventGroupWorkspaceContext({ kind: "program", context_type: "event", context_id: "event-1" }), true);
  assert.equal(isEventGroupWorkspaceContext({ kind: "program", context_type: "training", context_id: "event-1" }), false);
  assert.equal(isEventGroupWorkspaceContext({ kind: "care", context_type: "event", context_id: "event-1" }), false);
  assert.equal(isEventGroupWorkspaceContext({ kind: "program", context_type: "event", context_id: null }), false);
  assert.equal(canManageEventGroupInvitations({ kind: "program", context_type: "event", context_id: "event-1", my_role: "owner", can_invite: true, enterpriseAdminAuthorized: true }), true);
  assert.equal(canManageEventGroupInvitations({ kind: "program", context_type: "event", context_id: "event-1", my_role: "owner", can_invite: true, enterpriseAdminAuthorized: false }), false);
  assert.equal(canManageEventGroupInvitations({ kind: "program", context_type: "event", context_id: "event-1", my_role: "member", can_invite: true, enterpriseAdminAuthorized: true }), false);
  assert.equal(canManageEventGroupInvitations({ kind: "program", context_type: "event", context_id: "event-1", my_role: "owner", can_invite: false, enterpriseAdminAuthorized: true }), false);
  assert.equal(getGroupWorkspaceContextLabel({ kind: "program", context_type: "event", context_id: "event-1", context_name: "Summit", training_title: "Training leak" }), "Event · Summit");
  assert.equal(getGroupWorkspaceContextLabel({ kind: "program", context_type: "training", context_id: "training-1", context_name: "Cohort", training_title: "Training title" }), "Training title");
});

test("registered invitation payloads support explicit IDs, invite-all, exclusions, and later registrations", () => {
  assert.deepEqual(buildInviteRegisteredPayload({ user_ids: ["user-1", "user-1"] }), { user_ids: ["user-1"] });
  assert.deepEqual(buildInviteRegisteredPayload({ all_eligible: true, exclude_user_ids: ["user-2", "user-2"] }), { all_eligible: true, exclude_user_ids: ["user-2"] });
});

test("Event invitation success refreshes Group and Event query prefixes", () => {
  assert.deepEqual(eventGroupInvitationInvalidationQueryKeys("event-1", "group-1"), [
    ["group-chat", "group", "group-1"], ["group-chat", "members", "group-1"], ["group-chat", "current-member", "group-1"], ["group-chat", "invite-members", "group-1"], ["group-chat", "groups"], ["event-group"], ["event-group", "attendees", "event-1"], ["event-group", "groups", "event-1"],
  ]);
});

test("Event Groups remain compatible with the shared closed-room and socket message paths", () => {
  const groupId = "550e8400-e29b-41d4-a716-446655440011";
  const senderId = "550e8400-e29b-41d4-a716-446655440012";
  const messageId = "550e8400-e29b-41d4-a716-446655440013";
  assert.equal(isGroupChatRealtimeActiveStatus("closed"), true);
  assert.equal(normalizeGroupChatSocketEvent("new_message", { conversation_type: "group", conversation_id: groupId, message: { id: messageId, conversation_id: groupId, sender_id: senderId, created_at: "2026-10-01T09:00:00Z", content: "Event message" } }, groupId)?.event, "new_message");
});

test("read-only query states cover loading, error, empty, and ready", () => {
  assert.equal(resolveEventGroupQueryState({ isPending: true, isError: false, itemCount: 0 }), "loading");
  assert.equal(resolveEventGroupQueryState({ isPending: false, isError: true, itemCount: 0 }), "error");
  assert.equal(resolveEventGroupQueryState({ isPending: false, isError: false, itemCount: 0 }), "empty");
  assert.equal(resolveEventGroupQueryState({ isPending: false, isError: false, itemCount: 1 }), "ready");
});

test("capacity reserves the owner and does not promise invite-all delivery", () => {
  assert.deepEqual(summarizeEventGroupCapacity({ maxMembers: 10, selectedAttendeeCount: 3, selectedProviderCount: 2, inviteAllRegistered: false }), {
    maxMembers: 10, ownerReserved: 1, selectedMemberCount: 5, remainingMemberSlots: 4, inviteAllMayBeCapped: false,
  });
  assert.deepEqual(summarizeEventGroupCapacity({ maxMembers: 10, selectedAttendeeCount: 0, selectedProviderCount: 0, inviteAllRegistered: true }), {
    maxMembers: 10, ownerReserved: 1, selectedMemberCount: 0, remainingMemberSlots: 9, inviteAllMayBeCapped: true,
  });
  assert.equal(summarizeEventGroupCapacity({ maxMembers: null, selectedAttendeeCount: 1, selectedProviderCount: 1, inviteAllRegistered: true }).remainingMemberSlots, null);
});

test("Provider selection uses platform IDs and excludes the current account", () => {
  const provider = (user_id: string, is_me = false): EventGroupProvider => ({ user_id, name: user_id, registration_number: null, is_me });
  const selected = toggleEventGroupProviderSelection({}, provider("provider-1"));
  assert.equal(Object.keys(selected).length, 1);
  assert.equal(Object.keys(toggleEventGroupProviderSelection(selected, provider("provider-1"))).length, 0);
  assert.equal(Object.keys(toggleEventGroupProviderSelection(selected, provider("current", true))).length, 1);
});

test("Event avatar preview accepts PNG, JPG, and WebP while rejecting unsupported formats", () => {
  assert.equal(isSupportedEventGroupAvatarFile({ name: "avatar.png", type: "image/png" }), true);
  assert.equal(isSupportedEventGroupAvatarFile({ name: "avatar.jpg", type: "image/jpeg" }), true);
  assert.equal(isSupportedEventGroupAvatarFile({ name: "avatar.webp", type: "image/webp" }), true);
  assert.equal(isSupportedEventGroupAvatarFile({ name: "avatar.gif", type: "image/gif" }), false);
  assert.equal(isSupportedEventGroupAvatarFile({ name: "avatar.png", type: "" }), true);
  assert.equal(formatEventGroupAvatarFileSize(1536), "1.5 KB");
  assert.equal(formatEventGroupAvatarFileSize(null), "Size unavailable");
});

test("invite-all create payload uses platform-ID exclusions and omits registration identities", () => {
  const payload = buildEventGroupCreatePayload({
    name: "Event chat",
    contextId: "550e8400-e29b-41d4-a716-446655440010",
    inviteAllRegistered: true,
    excludeUserIds: ["550e8400-e29b-41d4-a716-446655440012", "550e8400-e29b-41d4-a716-446655440012"],
  });
  assert.equal(payload.invite_all_registered, true);
  assert.deepEqual(payload.exclude_user_ids, ["550e8400-e29b-41d4-a716-446655440012"]);
  assert.equal(payload.invitees, undefined);
});

test("Event Group creation validation enforces the OpenAPI name, description, UUID, and identity constraints", () => {
  const eventId = "550e8400-e29b-41d4-a716-446655440010";
  const valid = buildEventGroupCreatePayload({ name: "Event chat", contextId: eventId, description: "Discussion", invitees: [{ user_id: "550e8400-e29b-41d4-a716-446655440012" }] });
  assert.equal(validateEventGroupCreatePayload(valid), null);
  assert.match(validateEventGroupCreatePayload({ ...valid, name: "" }) ?? "", /name/i);
  assert.match(validateEventGroupCreatePayload({ ...valid, context_id: "event-1" }) ?? "", /identifier/i);
  assert.match(validateEventGroupCreatePayload({ ...valid, invitees: [{ user_id: "registration-1" }] }) ?? "", /identit/i);
  assert.equal(validateEventGroupCreatePayload({ ...valid, invitees: [] }), null);
  const providerOnly = buildEventGroupCreatePayload({ name: "Provider-only Event Group", contextId: eventId, invitees: [{ user_id: "550e8400-e29b-41d4-a716-446655440011" }] });
  assert.deepEqual(providerOnly.invitees, [{ user_id: "550e8400-e29b-41d4-a716-446655440011" }]);
});
