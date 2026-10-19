import assert from "node:assert/strict";
import test from "node:test";
import { applyPreviewMemberAction, buildCreateGroupPayload, buildGroupAvatarUploadFormData, buildReopenGroupPayload, buildUpdateGroupDetailsPayload, buildUpdateGroupSettingsPayload, canCloseGroupChat, canEditGroupChat, canReopenGroupChat, canUpdateGroupChatSettings, getGroupChatMemberDisplayName, getGroupChatReopenReasonError, getMemberManagementActions, isSupportedGroupAvatarFile, normalizeGroupAvatarUploadResponse, normalizeGroupChatPermissions, normalizeGroupLearner, normalizeGroupProvider, PREVIEW_GROUP_MEMBERS, resolveGroupAvatarDisplayUrl, resolveGroupChatAvatarUrl, splitGroupChatMembers } from "./group-chat-models.ts";
import type { GroupChatMember } from "./group-chat/group-chat.types";

test("builds the documented Group Chat avatar multipart fields", () => {
  const file = new File(["image"], "group.png", { type: "image/png" });
  const formData = buildGroupAvatarUploadFormData(file);
  assert.equal(formData.get("file"), file);
  assert.equal(formData.get("folder"), "group-avatars");
});

test("keeps avatar optional and normalizes uploaded avatar URLs", () => {
  const base = { name: "Group", contextId: "training-1", description: "", userIds: [], adminsOnlyPosting: true };
  assert.equal(buildCreateGroupPayload(base).avatar_url, undefined);
  assert.equal(buildCreateGroupPayload({ ...base, avatarUrl: " " }).avatar_url, undefined);
  assert.equal(buildCreateGroupPayload({ ...base, avatarUrl: " https://cdn.test/group.png " }).avatar_url, "https://cdn.test/group.png");
  assert.deepEqual(buildUpdateGroupDetailsPayload("Group", "Description", " https://cdn.test/group.png "), { name: "Group", description: "Description", avatar_url: "https://cdn.test/group.png" });
  assert.deepEqual(normalizeGroupAvatarUploadResponse({ url: " https://cdn.test/group.png " }), { url: "https://cdn.test/group.png" });
  assert.deepEqual(normalizeGroupAvatarUploadResponse({ data: { url: "https://cdn.test/group.png" } }), { url: "https://cdn.test/group.png" });
  assert.equal(normalizeGroupAvatarUploadResponse({ data: {} }), null);
});

test("prefers the selected local avatar preview and falls back to initials when absent", () => {
  assert.equal(resolveGroupAvatarDisplayUrl(" blob:group-preview ", "https://cdn.test/current.png"), "blob:group-preview");
  assert.equal(resolveGroupAvatarDisplayUrl(null, "/api/v1/uploads/group-avatars/current.webp"), "/api/v1/uploads/group-avatars/current.webp");
  assert.equal(resolveGroupAvatarDisplayUrl(" ", "https://cdn.test/current.png"), "https://cdn.test/current.png");
  assert.equal(resolveGroupAvatarDisplayUrl(null), null);
});

test("resolves backend-relative avatars through the Enterprise gateway", () => {
  const backendRelativeUrl = "/api/v1/uploads/group-avatars/group.webp";
  assert.equal(
    resolveGroupChatAvatarUrl(backendRelativeUrl, { chatApiBaseUrl: "/api/chat", gatewayMode: true }),
    "/api/chat/uploads/group-avatars/group.webp",
  );
});

test("resolves backend-relative avatars against the Shell direct Chat origin", () => {
  assert.equal(
    resolveGroupChatAvatarUrl("/api/v1/uploads/group-avatars/group.webp", { chatApiBaseUrl: "https://chat.wisdomtooth.tech/api/v1", gatewayMode: false }),
    "https://chat.wisdomtooth.tech/api/v1/uploads/group-avatars/group.webp",
  );
});

test("preserves supported avatar URLs and rejects unsupported values", () => {
  assert.equal(resolveGroupChatAvatarUrl("https://cdn.test/group.webp"), "https://cdn.test/group.webp");
  assert.equal(resolveGroupChatAvatarUrl("blob:group-preview"), "blob:group-preview");
  assert.equal(resolveGroupChatAvatarUrl(null), null);
  assert.equal(resolveGroupChatAvatarUrl("  "), null);
  assert.equal(resolveGroupChatAvatarUrl("javascript:alert(1)"), null);
  assert.equal(resolveGroupChatAvatarUrl("data:image/png;base64,unsafe"), null);
  assert.equal(resolveGroupChatAvatarUrl("/other/path/group.webp", { chatApiBaseUrl: "/api/chat", gatewayMode: true }), null);
});

test("accepts image avatars without inventing a size restriction", () => {
  assert.equal(isSupportedGroupAvatarFile(new File(["image"], "group.png", { type: "image/png" })), true);
  assert.equal(isSupportedGroupAvatarFile(new File(["text"], "notes.txt", { type: "text/plain" })), false);
});

test("uses only the explicit backend close permission", () => {
  assert.equal(canCloseGroupChat({ status: "open", permissions: { can_close: true } }), true);
  assert.equal(canCloseGroupChat({ status: "open", permissions: { can_close: null } }), false);
});

test("missing and false backend permissions deny controls", () => {
  assert.equal(canEditGroupChat({ status: "open", permissions: { can_edit_group: null } }), false);
  assert.equal(canUpdateGroupChatSettings({ status: "open", permissions: { can_change_settings: null } }), false);
  assert.equal(canCloseGroupChat({ status: "open", permissions: { can_close: false } }), false);
});

test("normalizes the confirmed backend permission names", () => {
  const permissions = normalizeGroupChatPermissions({ can_post: true, can_edit_group: true, can_change_settings: false, can_invite: true, can_reopen: true });
  assert.equal(permissions.can_post, true);
  assert.equal(permissions.can_edit_group, true);
  assert.equal(permissions.can_change_settings, false);
  assert.equal(permissions.can_invite, true);
  assert.equal(permissions.can_reopen, true);
  assert.equal(permissions.can_close, null);
});

test("closed groups are read-only and reopen requires explicit permission", () => {
  assert.equal(canCloseGroupChat({ status: "closed", permissions: { can_close: true } }), false);
  assert.equal(canEditGroupChat({ status: "closed", permissions: { can_edit_group: true } }), false);
  assert.equal(canUpdateGroupChatSettings({ status: "closed", permissions: { can_change_settings: true } }), false);
  assert.equal(canReopenGroupChat({ status: "closed", permissions: { can_reopen: true } }), true);
  assert.equal(canReopenGroupChat({ status: "closed", permissions: { can_reopen: false } }), false);
});

test("open-group controls follow backend permissions instead of role", () => {
  const group = { status: "open" };
  assert.equal(canEditGroupChat({ ...group, permissions: { can_edit_group: true } }), true);
  assert.equal(canUpdateGroupChatSettings({ ...group, permissions: { can_change_settings: true } }), true);
});

test("reopen reason validation and payload are backend-compatible", () => {
  assert.equal(getGroupChatReopenReasonError(""), "A reason is required to reopen this group.");
  assert.equal(getGroupChatReopenReasonError("no"), "The reopen reason must be at least 3 characters.");
  assert.equal(getGroupChatReopenReasonError("x".repeat(256)), "The reopen reason must be 255 characters or fewer.");
  assert.deepEqual(buildReopenGroupPayload("  Reopen for the next cohort  "), { reason: "Reopen for the next cohort" });
  assert.equal(buildReopenGroupPayload("  "), null);
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
