import assert from "node:assert/strict";
import test from "node:test";
import { buildCreateGroupPayload, countGroupChatCharacters, getGroupChatAvailableLearnerCount, getGroupChatAvailableProviderCount, GROUP_CHAT_DESCRIPTION_MAX_LENGTH, GROUP_CHAT_NAME_MAX_LENGTH, remainingGroupChatMemberSlots, summarizeGroupChatCapacity, validateGroupChatDetails } from "./group-chat-models.ts";
import { buildEventGroupCreatePayload, validateEventGroupCreatePayload } from "./group-chat/event-group.models.ts";

test("uses the documented Group name and description boundaries", () => {
  assert.equal(validateGroupChatDetails("a".repeat(GROUP_CHAT_NAME_MAX_LENGTH), "d".repeat(GROUP_CHAT_DESCRIPTION_MAX_LENGTH)), null);
  assert.equal(validateGroupChatDetails("a".repeat(GROUP_CHAT_NAME_MAX_LENGTH + 1), ""), "name_too_long");
  assert.equal(validateGroupChatDetails("Group", "d".repeat(GROUP_CHAT_DESCRIPTION_MAX_LENGTH + 1)), "description_too_long");
});

test("preserves Unicode code-point boundary behavior", () => {
  const emoji = String.fromCodePoint(0x1f600);
  assert.equal(countGroupChatCharacters(emoji.repeat(GROUP_CHAT_NAME_MAX_LENGTH)), GROUP_CHAT_NAME_MAX_LENGTH);
  assert.equal(validateGroupChatDetails(emoji.repeat(GROUP_CHAT_NAME_MAX_LENGTH), ""), null);
  assert.equal(validateGroupChatDetails(emoji.repeat(GROUP_CHAT_NAME_MAX_LENGTH + 1), ""), "name_too_long");
});

test("applies the same confirmed limits to Event Group creation", () => {
  const base = buildEventGroupCreatePayload({ name: "Event Group", contextId: "550e8400-e29b-41d4-a716-446655440010", description: "" });
  assert.equal(validateEventGroupCreatePayload({ ...base, name: "n".repeat(GROUP_CHAT_NAME_MAX_LENGTH) }), null);
  assert.match(validateEventGroupCreatePayload({ ...base, name: "n".repeat(GROUP_CHAT_NAME_MAX_LENGTH + 1) }) ?? "", /120/);
  assert.equal(validateEventGroupCreatePayload({ ...base, description: "d".repeat(GROUP_CHAT_DESCRIPTION_MAX_LENGTH) }), null);
  assert.match(validateEventGroupCreatePayload({ ...base, description: "d".repeat(GROUP_CHAT_DESCRIPTION_MAX_LENGTH + 1) }) ?? "", /500/);
});

test("rejects an empty Group name while allowing an empty description", () => {
  assert.equal(validateGroupChatDetails("   ", ""), "name_required");
});

test("does not truncate payload text before submission", () => {
  const name = ` ${"a".repeat(GROUP_CHAT_NAME_MAX_LENGTH + 1)} `;
  const description = ` ${"d".repeat(GROUP_CHAT_DESCRIPTION_MAX_LENGTH + 1)} `;
  const payload = buildCreateGroupPayload({ name, contextId: "training-id", description, userIds: [], adminsOnlyPosting: true });
  assert.equal(payload.name.length, GROUP_CHAT_NAME_MAX_LENGTH + 1);
  assert.equal(payload.description?.length, GROUP_CHAT_DESCRIPTION_MAX_LENGTH + 1);
});

test("uses backend available totals instead of loaded page lengths", () => {
  assert.equal(getGroupChatAvailableLearnerCount({ eligible_total: 8, pagination: { total: 49, page: 1, page_size: 10, total_pages: 5 } }), 8);
  assert.equal(getGroupChatAvailableProviderCount({ pagination: { total: 3, page: 1, page_size: 10, total_pages: 1 } }), 3);
  assert.equal(getGroupChatAvailableLearnerCount({ eligible_total: null, pagination: { total: 2, page: 2, page_size: 10, total_pages: 2 } }), 2);
});

test("keeps zero available counts and owner-reserved capacity explicit", () => {
  assert.equal(getGroupChatAvailableLearnerCount({ eligible_total: 0, pagination: { total: 0, page: 1, page_size: 10, total_pages: 1 } }), 0);
  assert.equal(getGroupChatAvailableProviderCount({ pagination: { total: 0, page: 1, page_size: 10, total_pages: 1 } }), 0);
  assert.equal(remainingGroupChatMemberSlots(50, 1), 48);
  assert.equal(getGroupChatAvailableLearnerCount(null), null);
  assert.equal(getGroupChatAvailableProviderCount(undefined), null);
});

test("summarizes dynamic capacity with the owner slot reserved", () => {
  assert.deepEqual(summarizeGroupChatCapacity(50, 0), { maxMembers: 50, selectedCount: 0, invitationSlotsAvailable: 49, ownerReserved: 1 });
  assert.deepEqual(summarizeGroupChatCapacity(30, 4), { maxMembers: 30, selectedCount: 4, invitationSlotsAvailable: 25, ownerReserved: 1 });
});
