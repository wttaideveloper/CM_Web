import assert from "node:assert/strict";
import test from "node:test";
import { buildCreateGroupPayload, buildGroupMemberInvitePayload, isGroupChatLearnerSelectable, isGroupChatProviderSelectable, remainingGroupChatMemberSlots } from "./group-chat-models.ts";
import type { GroupChatLearner, GroupChatProvider } from "./group-chat/group-chat.types";

const learner = (overrides: Partial<GroupChatLearner> = {}): GroupChatLearner => ({
  enrolment_id: "enrolment-1",
  name: "Learner One",
  email: "learner@example.test",
  enrolment_status: "active",
  user_id: "user-1",
  can_invite: true,
  reason: null,
  group_state: null,
  group_ids: [],
  enrolled_at: null,
  ...overrides,
});

const provider = (overrides: Partial<GroupChatProvider> = {}): GroupChatProvider => ({
  user_id: "provider-1",
  name: "Provider One",
  registration_number: null,
  is_training_instructor: false,
  is_me: false,
  ...overrides,
});

test("only learners with a backend user id and can_invite are selectable", () => {
  assert.equal(isGroupChatLearnerSelectable(learner()), true);
  assert.equal(isGroupChatLearnerSelectable(learner({ user_id: null })), false);
  assert.equal(isGroupChatLearnerSelectable(learner({ can_invite: false })), false);
});

test("the current Provider is not selectable as an additional member", () => {
  assert.equal(isGroupChatProviderSelectable(provider()), true);
  assert.equal(isGroupChatProviderSelectable(provider({ is_me: true })), false);
});

test("capacity reserves one slot for the group owner", () => {
  assert.equal(remainingGroupChatMemberSlots(50, 0), 49);
  assert.equal(remainingGroupChatMemberSlots(50, 48), 1);
  assert.equal(remainingGroupChatMemberSlots(50, 49), 0);
  assert.equal(remainingGroupChatMemberSlots(50, 60), 0);
});

test("creation payload uses Training context and deduplicated user IDs", () => {
  assert.deepEqual(buildCreateGroupPayload({
    name: " Wellness cohort ",
    contextId: "training-1",
    description: " A group for the cohort ",
    userIds: ["learner-1", "provider-1", "learner-1", ""],
    adminsOnlyPosting: true,
  }), {
    name: "Wellness cohort",
    kind: "program",
    context_type: "training",
    context_id: "training-1",
    description: "A group for the cohort",
    invitees: [{ user_id: "learner-1" }, { user_id: "provider-1" }],
    admins_only_posting: true,
  });
});

test("creation payload never invents an owner invitee", () => {
  const payload = buildCreateGroupPayload({ name: "Group", contextId: "training-1", description: "", userIds: ["member-1"], adminsOnlyPosting: false });
  assert.deepEqual(payload.invitees, [{ user_id: "member-1" }]);
});

test("additional member invitation matches the InviteMembers schema", () => {
  assert.deepEqual(buildGroupMemberInvitePayload([
    { user_id: " provider-1 ", display_name: " Verified Provider " },
    { user_id: "provider-1", display_name: "Verified Provider (updated)" },
    { user_id: "learner-1" },
    { user_id: "" },
  ]), {
    invitees: [
      { user_id: "provider-1", display_name: "Verified Provider (updated)" },
      { user_id: "learner-1" },
    ],
  });
});
