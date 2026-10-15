import assert from "node:assert/strict";
import test from "node:test";
import { applyPreviewMemberAction, buildUpdateGroupDetailsPayload, buildUpdateGroupSettingsPayload, canCloseGroupChat, canEditGroupChat, canUpdateGroupChatSettings, getGroupChatMemberDisplayName, getMemberManagementActions, normalizeGroupLearner, normalizeGroupProvider, PREVIEW_GROUP_MEMBERS, splitGroupChatMembers } from "./group-chat-models.ts";
import type { GroupChatMember } from "./group-chat/group-chat.types";

test("confirmed owners can close an open group when the role is present", () => {
  assert.equal(canCloseGroupChat({ status: "open", my_role: "owner", permissions: { can_close_group: null } }), true);
});

test("admins require the explicit close permission", () => {
  assert.equal(canCloseGroupChat({ status: "open", my_role: "admin", permissions: { can_close_group: true } }), true);
  assert.equal(canCloseGroupChat({ status: "open", my_role: "admin", permissions: { can_close_group: null } }), false);
});

test("members and compliance viewers cannot close a group", () => {
  assert.equal(canCloseGroupChat({ status: "open", my_role: "member", permissions: { can_close_group: true } }), false);
  assert.equal(canCloseGroupChat({ status: "open", my_role: "compliance", permissions: { can_close_group: true } }), false);
});

test("closed groups cannot be closed again", () => {
  assert.equal(canCloseGroupChat({ status: "closed", my_role: "owner", permissions: { can_close_group: true } }), false);
});

test("confirmed owners can access group details and messaging settings", () => {
  const group = { status: "open", my_role: "owner" };
  assert.equal(canEditGroupChat({ ...group, permissions: { can_manage_group: null, can_edit_group: null } }), true);
  assert.equal(canUpdateGroupChatSettings({ ...group, permissions: { can_manage_group: null, can_update_settings: null } }), true);
});

test("non-owners still require explicit management permissions", () => {
  const group = { status: "open", my_role: "member" };
  assert.equal(canEditGroupChat({ ...group, permissions: { can_manage_group: null, can_edit_group: null } }), false);
  assert.equal(canUpdateGroupChatSettings({ ...group, permissions: { can_manage_group: null, can_update_settings: null } }), false);
});

test("normalizes enrolled learners and preserves eligibility", () => {
  const learner = normalizeGroupLearner({ id: "learner-1", participant_name: "Learner One", participant_email: "one@example.test", status: "approved" }, 0);
  assert.deepEqual(learner, { id: "learner-1", name: "Learner One", email: "one@example.test", status: "approved", eligible: true });
});

test("does not mark cancelled enrolments eligible", () => {
  const learner = normalizeGroupLearner({ id: "learner-2", name: "Learner Two", status: "cancelled" }, 1);
  assert.equal(learner?.eligible, false);
});

test("only tenant members with provider roles become provider candidates", () => {
  const provider = normalizeGroupProvider({ id: "membership-1", userId: "user-1", email: "provider@example.test", fullName: "Provider One", role: "Provider", roleName: "Provider", status: "active", roleSlug: "provider" });
  const nonProvider = normalizeGroupProvider({ id: "membership-2", userId: "user-2", email: "admin@example.test", fullName: "Admin One", role: "Admin", roleName: "Admin", status: "active", roleSlug: "admin" });
  assert.equal(provider?.id, "user-1");
  assert.equal(nonProvider, null);
});

test("owner can promote only the explicitly verified provider preview", () => {
  const verifiedProvider = PREVIEW_GROUP_MEMBERS.find((member) => member.id === "preview-verified-provider");
  const unverifiedProvider = PREVIEW_GROUP_MEMBERS.find((member) => member.id === "preview-provider");
  assert.deepEqual(getMemberManagementActions("Owner", verifiedProvider!), ["make-admin", "remove-member"]);
  assert.deepEqual(getMemberManagementActions("Owner", unverifiedProvider!), ["remove-member"]);
});

test("owner and admin permissions do not change owner permissions", () => {
  const owner = PREVIEW_GROUP_MEMBERS.find((member) => member.role === "Owner")!;
  assert.deepEqual(getMemberManagementActions("Owner", owner), []);
  assert.deepEqual(getMemberManagementActions("Admin", owner), []);
});

test("regular members cannot manage members", () => {
  const learner = PREVIEW_GROUP_MEMBERS.find((member) => member.kind === "learner")!;
  assert.deepEqual(getMemberManagementActions("Member", learner), []);
});

test("mock promotion and demotion update only local membership state", () => {
  const promoted = applyPreviewMemberAction(PREVIEW_GROUP_MEMBERS, "preview-verified-provider", "make-admin");
  assert.equal(promoted.find((member) => member.id === "preview-verified-provider")?.role, "Admin");

  const demoted = applyPreviewMemberAction(promoted, "preview-verified-provider", "remove-admin");
  assert.equal(demoted.find((member) => member.id === "preview-verified-provider")?.role, "Member");

  const removed = applyPreviewMemberAction(demoted, "preview-learner-one", "remove-member");
  assert.equal(removed.some((member) => member.id === "preview-learner-one"), false);
});

test("splits active and invited members without exposing pending user IDs", () => {
  const members: GroupChatMember[] = [
    { id: "owner", user_id: "owner-user", name: "Owner", role: "owner", member_kind: "provider", membership_status: "active", joined_at: null, is_current_user: true, can_manage: true },
    { id: "learner-1", user_id: "learner-user-1", name: "Invited learner", role: "member", member_kind: "patient", membership_status: "invited", joined_at: null, is_current_user: false, can_manage: false },
    { id: "provider-1", user_id: "provider-user-1", name: "Invited Provider", role: "member", member_kind: "provider", membership_status: "invited", joined_at: null, is_current_user: false, can_manage: false },
  ];
  const result = splitGroupChatMembers(members);
  assert.equal(result.active.length, 1);
  assert.equal(result.pending.length, 2);
  assert.deepEqual(result.pending.map((member) => member.name), ["Invited learner", "Invited Provider"]);
});

test("uses privacy-safe names for null pending invitees", () => {
  assert.equal(getGroupChatMemberDisplayName(null, "invited", "patient"), "Invited learner");
  assert.equal(getGroupChatMemberDisplayName("  ", "invited", "provider"), "Invited Provider");
  assert.equal(getGroupChatMemberDisplayName(null, "active", "patient"), "Group member");
});

test("builds minimal Group Chat update payloads", () => {
  assert.deepEqual(buildUpdateGroupDetailsPayload(" Group name ", " Description "), { name: "Group name", description: "Description" });
  assert.deepEqual(buildUpdateGroupSettingsPayload(true), { admins_only_posting: true });
  assert.deepEqual(buildUpdateGroupSettingsPayload(false), { admins_only_posting: false });
});
