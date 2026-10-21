import assert from "node:assert/strict";
import test from "node:test";
import { applyPreviewMemberAction, getMemberManagementActions, normalizeGroupLearner, normalizeGroupProvider, PREVIEW_GROUP_MEMBERS } from "./group-chat-models.ts";

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
