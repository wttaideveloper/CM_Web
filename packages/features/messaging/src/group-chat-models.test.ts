import assert from "node:assert/strict";
import test from "node:test";
import { applyPreviewMemberAction, buildChangeGroupMemberRolePayload, buildCreateGroupPayload, buildEditGroupChatMessagePayload, buildGroupAvatarUploadFormData, buildGroupChatAttachmentMessagePayload, buildGroupChatAttachmentUploadFormData, buildGroupChatMemberMutePayload, buildGroupChatMessageHistoryQuery, buildGroupChatFilesQuery, buildGroupChatMessageReadStatusPath, buildGroupChatReactionPayload, buildGroupChatReactionQuery, buildGroupChatSearchQuery, buildGroupChatTextMessagePayload, buildHideGroupChatMessagePayload, buildGroupMemberRemovalQuery, buildReopenGroupPayload, buildTransferGroupOwnershipPayload, buildUpdateGroupDetailsPayload, buildUpdateGroupSettingsPayload, canCloseGroupChat, canEditGroupChat, canEditGroupChatMessage, canHideGroupChatMessage, canPinGroupChatMessage, canReactToGroupChatMessage, canReplyToGroupChatMessage, canReopenGroupChat, canRetractGroupChatMessage, canSendGroupChatMessage, canShowGroupChatReadStatusIndicator, canUpdateGroupChatSettings, canViewGroupChatReadStatus, formatGroupChatAttachmentSummary, formatGroupChatSharedFileSize, getGroupChatMessageDisplayText, getGroupChatMemberDisplayName, getGroupChatMemberOwnershipAction, getGroupChatMemberPostingAction, getGroupChatMemberRemovalAction, getGroupChatMemberRoleActions, getGroupChatPostingRestrictionMessage, getGroupChatReadStatusMemberNames, getGroupChatReadStatusTickState, getGroupChatReopenReasonError, getGroupChatReplyPreview, getGroupChatReplyReferencePreview, getGroupChatSafeMessagePreview, getGroupChatSearchViewState, getMemberManagementActions, isGroupChatReactionSelected, isSupportedGroupAvatarFile, mergeGroupChatMessagePages, normalizeGroupAvatarUploadResponse, normalizeGroupChatAttachmentUploadResponse, normalizeGroupChatMemberPostingMute, normalizeGroupChatMessage, normalizeGroupChatMessageHistory, normalizeGroupChatMessageMutationResponse, normalizeGroupChatMessageReadStatus, normalizeGroupChatPermissions, normalizeGroupChatPinnedMessageHistory, normalizeGroupChatReactionCounts, normalizeGroupChatReactionSettings, normalizeGroupChatReplyReference, normalizeGroupChatSharedFilesResponse, normalizeGroupLearner, normalizeGroupProvider, parseGroupChatAttachmentFileName, parseGroupChatMessageTimestamp, PREVIEW_GROUP_MEMBERS, resolveGroupAvatarDisplayUrl, resolveGroupChatAttachmentMetadata, resolveGroupChatAvatarUrl, splitGroupChatMembers } from "./group-chat-models.ts";
import type { GroupChatMember, GroupChatMessage } from "./group-chat/group-chat.types";

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

test("builds the existing attachment upload contract for a Group conversation", () => {
  const file = new File(["image"], "photo.png", { type: "image/png" });
  const formData = buildGroupChatAttachmentUploadFormData(" group-1 ", file, "image");
  assert.ok(formData);
  assert.equal(formData.get("conversation_id"), "group-1");
  assert.equal(formData.get("file"), file);
  assert.equal(formData.get("attachment_type"), "image");
  assert.equal(buildGroupChatAttachmentUploadFormData("", file, "image"), null);
});

test("normalizes the Direct Chat attachment response fields and builds the Group message body", () => {
  const attachment = normalizeGroupChatAttachmentUploadResponse({ data: { attachment_id: "attachment-1", filename: "report.pdf", attachment_type: "document", download_url: "/attachments/attachment-1", file_size: 42, mime_type: "application/pdf" } }, "document", "fallback.pdf");
  assert.deepEqual(attachment, { id: "attachment-1", file_name: "report.pdf", attachment_type: "document", download_url: "/attachments/attachment-1", file_size: 42, mime_type: "application/pdf" });
  assert.deepEqual(buildGroupChatAttachmentMessagePayload("image", " attachment-2 "), { message_type: "image", attachment_id: "attachment-2" });
  assert.equal(buildGroupChatAttachmentMessagePayload("image", " "), null);
  assert.equal(normalizeGroupChatAttachmentUploadResponse({ data: {} }, "image", "photo.png"), null);
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
    { id: "owner", user_id: "owner-user", name: "Owner", role: "owner", member_kind: "provider", membership_status: "active", joined_at: null, is_current_user: true, can_manage: true, is_verified_provider: null, can_be_admin: null, can_receive_ownership: null, posting_muted: false, posting_muted_until: null },
    { id: "learner-1", user_id: "learner-user-1", name: "Invited learner", role: "member", member_kind: "patient", membership_status: "invited", joined_at: null, is_current_user: false, can_manage: false, is_verified_provider: null, can_be_admin: null, can_receive_ownership: null, posting_muted: null, posting_muted_until: null },
    { id: "provider-1", user_id: "provider-user-1", name: "Invited Provider", role: "member", member_kind: "provider", membership_status: "invited", joined_at: null, is_current_user: false, can_manage: false, is_verified_provider: null, can_be_admin: null, can_receive_ownership: null, posting_muted: null, posting_muted_until: null },
  ];
  const result = splitGroupChatMembers(members);
  assert.equal(result.active.length, 1);
  assert.equal(result.pending.length, 2);
  assert.deepEqual(result.pending.map((member) => member.name), ["Invited learner", "Invited Provider"]);
});

test("classifies pending and removes removed or unknown records from Active Members", () => {
  const base: GroupChatMember = { id: "member", user_id: "user", name: "Member", role: "member", member_kind: "patient", membership_status: "active", joined_at: null, is_current_user: false, can_manage: null, is_verified_provider: null, can_be_admin: null, can_receive_ownership: null, posting_muted: false, posting_muted_until: null };
  const result = splitGroupChatMembers([
    base,
    { ...base, id: "pending", membership_status: "pending" },
    { ...base, id: "removed", membership_status: "removed" },
    { ...base, id: "unknown", membership_status: "left" },
  ]);
  assert.deepEqual(result.active.map((member) => member.id), ["member"]);
  assert.deepEqual(result.pending.map((member) => member.id), ["pending"]);
  assert.deepEqual(result.excluded.map((member) => member.id), ["removed", "unknown"]);
});

test("promotion uses backend can_be_admin and demotion uses actor permission", () => {
  const permissions = { can_make_admin: true, can_remove_admin: true } as const;
  const provider: GroupChatMember = { id: "provider", user_id: "provider-user", name: "Provider", role: "member", member_kind: "provider", membership_status: "active", joined_at: null, is_current_user: false, can_manage: null, is_verified_provider: true, can_be_admin: true, can_receive_ownership: true, posting_muted: false, posting_muted_until: null };
  const admin: GroupChatMember = { ...provider, id: "admin", user_id: "admin-user", role: "admin" };
  const learner: GroupChatMember = { ...provider, id: "learner", user_id: "learner-user", member_kind: "patient", can_be_admin: false };
  const owner: GroupChatMember = { ...provider, id: "owner", user_id: "owner-user", role: "owner" };
  assert.deepEqual(getGroupChatMemberRoleActions(provider, permissions, [provider], "owner-user"), ["make-admin"]);
  assert.deepEqual(getGroupChatMemberRoleActions(admin, permissions, [admin], "owner-user"), ["remove-admin"]);
  assert.deepEqual(getGroupChatMemberRoleActions(learner, permissions, [learner], "owner-user"), []);
  assert.deepEqual(getGroupChatMemberRoleActions(owner, permissions, [owner], "owner-user"), []);
  assert.deepEqual(getGroupChatMemberRoleActions({ ...provider, can_manage: false }, permissions, [provider], "owner-user"), []);
});

test("promotion respects the three-admin limit and backend permissions", () => {
  const provider: GroupChatMember = { id: "provider", user_id: "provider-user", name: "Provider", role: "member", member_kind: "provider", membership_status: "active", joined_at: null, is_current_user: false, can_manage: true, is_verified_provider: true, can_be_admin: true, can_receive_ownership: true, posting_muted: false, posting_muted_until: null };
  const admins: GroupChatMember[] = [1, 2, 3].map((id) => ({ ...provider, id: `admin-${id}`, user_id: `admin-user-${id}`, role: "admin" }));
  assert.deepEqual(getGroupChatMemberRoleActions(provider, { can_make_admin: true, can_remove_admin: true }, admins, null), []);
  assert.deepEqual(getGroupChatMemberRoleActions(provider, { can_make_admin: null, can_remove_admin: true }, [], null), []);
});

test("ownership transfer is limited to an active verified Provider in an open group", () => {
  const provider: GroupChatMember = { id: "provider", user_id: "provider-user", name: "Provider", role: "member", member_kind: "provider", membership_status: "active", joined_at: null, is_current_user: false, can_manage: null, is_verified_provider: true, can_be_admin: true, can_receive_ownership: true, posting_muted: false, posting_muted_until: null };
  const permissions = { can_transfer_ownership: true } as const;
  assert.equal(getGroupChatMemberOwnershipAction(provider, permissions, "owner-user", "open"), "transfer-ownership");
  assert.equal(getGroupChatMemberOwnershipAction(provider, { can_transfer_ownership: false }, "owner-user", "open"), null);
  assert.equal(getGroupChatMemberOwnershipAction(provider, permissions, "owner-user", "closed"), null);
  assert.equal(getGroupChatMemberOwnershipAction(provider, permissions, "owner-user", null), null);
  assert.equal(getGroupChatMemberOwnershipAction({ ...provider, can_receive_ownership: false }, permissions, "owner-user", "open"), null);
  assert.equal(getGroupChatMemberOwnershipAction({ ...provider, membership_status: "invited" }, permissions, "owner-user", "open"), null);
  assert.equal(getGroupChatMemberOwnershipAction({ ...provider, membership_status: "removed" }, permissions, "owner-user", "open"), null);
  assert.equal(getGroupChatMemberOwnershipAction({ ...provider, can_receive_ownership: null }, permissions, "owner-user", "open"), null);
  assert.equal(getGroupChatMemberOwnershipAction({ ...provider, user_id: "owner-user", role: "owner" }, permissions, "owner-user", "open"), null);
  assert.equal(getGroupChatMemberOwnershipAction({ ...provider, user_id: null }, permissions, "owner-user", "open"), null);
});

test("ownership transfer payload trims and requires the target user ID", () => {
  assert.deepEqual(buildTransferGroupOwnershipPayload(" provider-user "), { user_id: "provider-user" });
  assert.equal(buildTransferGroupOwnershipPayload("   "), null);
});

test("builds exact promotion and demotion role payloads", () => {
  assert.deepEqual(buildChangeGroupMemberRolePayload("admin"), { role: "admin" });
  assert.deepEqual(buildChangeGroupMemberRolePayload("member", "  compliance review  "), { role: "member", reason: "compliance review" });
  assert.equal(buildChangeGroupMemberRolePayload("member", "   "), null);
});

test("allows owners to remove eligible active members and cancel their pending invitations", () => {
  const member: GroupChatMember = { id: "member", user_id: "member-user", name: "Member", role: "member", member_kind: "patient", membership_status: "active", joined_at: null, is_current_user: false, can_manage: null, is_verified_provider: null, can_be_admin: null, can_receive_ownership: null, posting_muted: false, posting_muted_until: null };
  const pending = { ...member, id: "pending", role: "invited", membership_status: "pending", can_manage: false } satisfies GroupChatMember;
  const permissions = { can_remove_members: true } as const;
  assert.equal(getGroupChatMemberRemovalAction(member, permissions, "owner-user"), "remove-member");
  assert.equal(getGroupChatMemberRemovalAction(pending, permissions, "owner-user"), "cancel-invitation");
});

test("hides removal and cancellation for owners, current users, admins, and unmanaged members", () => {
  const base: GroupChatMember = { id: "member", user_id: "member-user", name: "Member", role: "member", member_kind: "provider", membership_status: "active", joined_at: null, is_current_user: false, can_manage: null, is_verified_provider: null, can_be_admin: null, can_receive_ownership: null, posting_muted: false, posting_muted_until: null };
  const permissions = { can_remove_members: true } as const;
  assert.equal(getGroupChatMemberRemovalAction({ ...base, role: "owner" }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberRemovalAction({ ...base, is_current_user: true }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberRemovalAction({ ...base, role: "admin" }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberRemovalAction({ ...base, can_manage: false }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberRemovalAction({ ...base, user_id: null }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberRemovalAction(base, { can_remove_members: false }, "owner-user"), null);
  assert.equal(getGroupChatMemberRemovalAction(base, { can_remove_members: null }, "owner-user"), null);
});

test("encodes an optional member-removal reason without sending a body", () => {
  assert.equal(buildGroupMemberRemovalQuery("  compliance & safety review  ").toString(), "reason=compliance+%26+safety+review");
  assert.equal(buildGroupMemberRemovalQuery("   ").toString(), "");
});

test("normalizes confirmed member posting-mute fields and preserves unknown state", () => {
  assert.deepEqual(normalizeGroupChatMemberPostingMute({ posting_muted: true, posting_muted_until: " 2030-01-02T03:04:05Z " }), { posting_muted: true, posting_muted_until: "2030-01-02T03:04:05Z" });
  assert.deepEqual(normalizeGroupChatMemberPostingMute({ posting_muted: false, posting_muted_until: null }), { posting_muted: false, posting_muted_until: null });
  assert.deepEqual(normalizeGroupChatMemberPostingMute({}), { posting_muted: null, posting_muted_until: null });
  assert.deepEqual(normalizeGroupChatMemberPostingMute({ posting_muted: "false", posting_muted_until: 123 }), { posting_muted: null, posting_muted_until: null });
});

test("builds the required empty JSON body for basic mute", () => {
  assert.deepEqual(buildGroupChatMemberMutePayload(), {});
});

test("shows mute and unmute only for eligible active members with known state", () => {
  const permissions = { can_mute_members: true } as const;
  const member: GroupChatMember = { id: "member", user_id: "member-user", name: "Member", role: "member", member_kind: "patient", membership_status: "active", joined_at: null, is_current_user: false, can_manage: null, is_verified_provider: null, can_be_admin: null, can_receive_ownership: null, posting_muted: false, posting_muted_until: null };
  assert.equal(getGroupChatMemberPostingAction(member, permissions, "owner-user"), "mute-posting");
  assert.equal(getGroupChatMemberPostingAction({ ...member, posting_muted: true }, permissions, "owner-user"), "unmute-posting");
  assert.equal(getGroupChatMemberPostingAction({ ...member, posting_muted: null }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberPostingAction({ ...member, posting_muted: undefined } as unknown as GroupChatMember, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberPostingAction({ ...member, role: "owner" }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberPostingAction({ ...member, is_current_user: true }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberPostingAction({ ...member, membership_status: "pending" }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberPostingAction({ ...member, membership_status: "removed" }, permissions, "owner-user"), null);
  assert.equal(getGroupChatMemberPostingAction(member, { can_mute_members: false }, "owner-user"), null);
  assert.equal(getGroupChatMemberPostingAction(member, { can_mute_members: null }, "owner-user"), null);
});

test("uses privacy-safe names for null pending invitees", () => {
  assert.equal(getGroupChatMemberDisplayName(null, "invited", "patient"), "Invited learner");
  assert.equal(getGroupChatMemberDisplayName(null, "pending", "patient"), "Invited learner");
  assert.equal(getGroupChatMemberDisplayName("  ", "invited", "provider"), "Invited Provider");
  assert.equal(getGroupChatMemberDisplayName(null, "active", "patient"), "Group member");
});

test("builds minimal Group Chat update payloads", () => {
  assert.deepEqual(buildUpdateGroupDetailsPayload(" Group name ", " Description "), { name: "Group name", description: "Description" });
  assert.deepEqual(buildUpdateGroupSettingsPayload(true), { admins_only_posting: true });
  assert.deepEqual(buildUpdateGroupSettingsPayload(false), { admins_only_posting: false });
});

test("normalizes the documented Group Chat message response", () => {
  const message = normalizeGroupChatMessage({
    id: "message-1",
    conversation_id: "group-1",
    sender_id: "user-1",
    sender_name: "Provider One",
    sender_kind: "provider",
    message_type: "text",
    content: "Hello everyone",
    attachment_id: null,
    status: "visible",
    placeholder: null,
    reply_to: null,
    mentions: ["user-2"],
    mentions_all: false,
    mentions_me: false,
    is_edited: false,
    edited_at: null,
    pinned: false,
    reactions: {},
    my_reactions: [],
    read_by: ["user-1"],
    created_at: "2026-10-19T09:00:00Z",
  });
  assert.equal(message?.sender_name, "Provider One");
  assert.equal(message?.content, "Hello everyone");
  assert.equal(normalizeGroupChatMessage({ id: "missing-contract-fields" }), null);
});

test("preserves attachment metadata in Group Chat history", () => {
  const message = normalizeGroupChatMessage({
    id: "image-message",
    conversation_id: "group-1",
    sender_id: "user-1",
    sender_name: "Provider One",
    sender_kind: "provider",
    message_type: "image",
    content: null,
    attachment_id: "attachment-1",
    file_name: "photo.png",
    mime_type: "image/png",
    attachment: { attachment_id: "attachment-1", file_name: "photo.png", attachment_type: "image", mime_type: "image/png" },
    status: "visible",
    placeholder: null,
    reply_to: null,
    mentions: [],
    mentions_all: false,
    mentions_me: false,
    is_edited: false,
    edited_at: null,
    pinned: false,
    reactions: {},
    my_reactions: [],
    read_by: [],
    created_at: "2026-10-19T09:00:00Z",
  });
  assert.equal(message?.attachment_id, "attachment-1");
  assert.equal(message?.file_name, "photo.png");
  assert.equal(message?.attachment?.attachment_type, "image");
});

test("allows an attachment author to retract without exposing edit", () => {
  const message = normalizeGroupChatMessage({
    id: "attachment-message",
    conversation_id: "group-1",
    sender_id: "user-1",
    sender_name: "Provider One",
    sender_kind: "provider",
    message_type: "image",
    content: null,
    attachment_id: "attachment-1",
    status: "visible",
    placeholder: null,
    reply_to: null,
    mentions: [],
    mentions_all: false,
    mentions_me: false,
    is_edited: false,
    edited_at: null,
    pinned: false,
    reactions: {},
    my_reactions: [],
    read_by: [],
    created_at: "2026-10-19T09:00:00Z",
  })!;
  assert.equal(canRetractGroupChatMessage(message, "user-1"), true);
  assert.equal(canRetractGroupChatMessage(message, "user-2"), false);
  assert.equal(canEditGroupChatMessage(message, "user-1"), false);
  assert.equal(canRetractGroupChatMessage({ ...message, message_type: "system" }, "user-1"), false);
  assert.equal(canRetractGroupChatMessage({ ...message, status: "removed_by_admin" }, "user-1"), false);
});

test("resolves authorized attachment metadata and keeps a safe fallback", () => {
  const message = normalizeGroupChatMessage({
    id: "attachment-metadata",
    conversation_id: "group-1",
    sender_id: "user-1",
    sender_name: "Provider One",
    sender_kind: "provider",
    message_type: "image",
    content: null,
    attachment_id: "attachment-1",
    status: "visible",
    placeholder: null,
    reply_to: null,
    mentions: [],
    mentions_all: false,
    mentions_me: false,
    is_edited: false,
    edited_at: null,
    pinned: false,
    reactions: {},
    my_reactions: [],
    created_at: "2026-10-19T09:00:00Z",
  })!;
  assert.deepEqual(resolveGroupChatAttachmentMetadata(message, { fileName: "Castlevania_S4.webp", mimeType: "image/webp", fileSize: 893 * 1024 }), { file_name: "Castlevania_S4.webp", mime_type: "image/webp", file_size: 893 * 1024 });
  assert.equal(formatGroupChatAttachmentSummary({ file_name: "report.pdf", mime_type: "application/pdf", file_size: Math.round(1.34 * 1024 * 1024) }), "PDF document · 1.34 MB");
  assert.equal(formatGroupChatAttachmentSummary({ file_name: "Attachment", mime_type: null, file_size: null }), "Protected file");
  assert.deepEqual(resolveGroupChatAttachmentMetadata(message), { file_name: "Attachment", mime_type: null, file_size: null });
});

test("normalizes safe reply references and hides backend content when marked hidden", () => {
  assert.deepEqual(normalizeGroupChatReplyReference({ id: "message-1", sender_name: "Provider One", preview: "See you then", is_hidden: false }), { id: "message-1", sender_name: "Provider One", preview: "See you then", is_hidden: false });
  assert.deepEqual(normalizeGroupChatReplyReference({ id: "message-2", sender_name: "Provider Two", preview: "Private content", is_hidden: true }), { id: "message-2", sender_name: "Provider Two", preview: "Original message unavailable.", is_hidden: true });
  assert.equal(normalizeGroupChatReplyReference({ preview: "No identifier" }), null);
});

test("allows replies only for visible non-system messages when posting is allowed", () => {
  const message = normalizeGroupChatMessage({ id: "reply-target", conversation_id: "group-1", sender_id: "user-1", sender_name: "Provider One", sender_kind: "provider", message_type: "text", content: "See you then", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: {}, my_reactions: [], created_at: "2026-10-19T09:00:00Z" })!;
  assert.equal(canReplyToGroupChatMessage(message, "open", true, false), true);
  assert.equal(canReplyToGroupChatMessage(message, "closed", true, false), false);
  assert.equal(canReplyToGroupChatMessage(message, "open", false, false), false);
  assert.equal(canReplyToGroupChatMessage(message, "open", true, true), false);
  assert.equal(canReplyToGroupChatMessage({ ...message, message_type: "system" }, "open", true, false), false);
  assert.equal(getGroupChatReplyPreview(message), "See you then");
  assert.equal(getGroupChatReplyPreview({ ...message, message_type: "image", content: null }), "Image");
  assert.equal(getGroupChatReplyPreview({ ...message, status: "removed_by_admin", content: "Private content" }), "Original message unavailable.");
});

test("uses loaded visible attachment types without overriding backend privacy", () => {
  const base = {
    id: "attachment-target",
    conversation_id: "group-1",
    sender_id: "user-1",
    sender_name: "Provider One",
    sender_kind: "provider",
    content: null,
    attachment_id: "attachment-1",
    status: "visible",
    placeholder: null,
    reply_to: null,
    mentions: [],
    mentions_all: false,
    mentions_me: false,
    is_edited: false,
    edited_at: null,
    pinned: false,
    reactions: {},
    read_by: [],
    created_at: "2026-10-19T09:00:00Z",
  };
  const visibleImage = normalizeGroupChatMessage({ ...base, message_type: "image" })!;
  const visibleDocument = normalizeGroupChatMessage({ ...base, id: "document-target", message_type: "document" })!;
  const visibleAudio = normalizeGroupChatMessage({ ...base, id: "audio-target", message_type: "audio" })!;
  const visibleVideo = normalizeGroupChatMessage({ ...base, id: "video-target", message_type: "video" })!;
  const reply = normalizeGroupChatReplyReference({ id: "attachment-target", sender_name: "Provider One", preview: "Original message unavailable.", is_hidden: false })!;
  assert.equal(getGroupChatReplyReferencePreview(reply, visibleImage), "Image");
  assert.equal(getGroupChatReplyReferencePreview(reply, visibleDocument), "Document");
  assert.equal(getGroupChatReplyReferencePreview(reply, visibleAudio), "Audio");
  assert.equal(getGroupChatReplyReferencePreview(reply, visibleVideo), "Video");
  assert.equal(getGroupChatReplyReferencePreview({ ...reply, is_hidden: true }, visibleImage), "Original message unavailable.");
  assert.equal(getGroupChatReplyReferencePreview(reply, { ...visibleImage, status: "retracted" }), "Original message unavailable.");
  assert.equal(getGroupChatReplyReferencePreview(normalizeGroupChatReplyReference({ id: "text-target", sender_name: "Provider One", preview: "Thanks", is_hidden: false })!, normalizeGroupChatMessage({ ...base, id: "text-target", message_type: "text", content: "Thanks" })!), "Thanks");
});

test("parses standard Content-Disposition filename forms safely", () => {
  assert.equal(parseGroupChatAttachmentFileName("attachment; filename*=UTF-8''Attachment%20%281%29.pdf"), "Attachment (1).pdf");
  assert.equal(parseGroupChatAttachmentFileName('attachment; filename="spaces and (parentheses).pdf"'), "spaces and (parentheses).pdf");
  assert.equal(parseGroupChatAttachmentFileName("attachment; filename=Events_User_Flow.pdf"), "Events_User_Flow.pdf");
  assert.equal(parseGroupChatAttachmentFileName("attachment; filename=ordinary.pdf; filename*=UTF-8''preferred%20name.pdf"), "preferred name.pdf");
  assert.equal(parseGroupChatAttachmentFileName(null), null);
  assert.equal(parseGroupChatAttachmentFileName("attachment; filename*=UTF-8''bad%ZZ.pdf; filename=Fallback.pdf"), "Fallback.pdf");
  assert.equal(parseGroupChatAttachmentFileName("attachment; filename*=UTF-16''ignored.pdf; filename=Fallback.pdf"), "Fallback.pdf");
});

test("keeps metadata resolution independent for multiple attachments", () => {
  const createMessage = (id: string, attachmentId: string) => normalizeGroupChatMessage({
    id,
    conversation_id: "group-1",
    sender_id: "user-1",
    sender_name: "Provider One",
    sender_kind: "provider",
    message_type: "document",
    content: null,
    attachment_id: attachmentId,
    status: "visible",
    placeholder: null,
    reply_to: null,
    mentions: [],
    mentions_all: false,
    mentions_me: false,
    is_edited: false,
    edited_at: null,
    pinned: false,
    reactions: {},
    created_at: "2026-10-19T09:00:00Z",
  })!;
  const first = resolveGroupChatAttachmentMetadata(createMessage("message-1", "attachment-1"), { fileName: "Attachment (1).pdf", mimeType: "application/pdf", fileSize: 1024 });
  const second = resolveGroupChatAttachmentMetadata(createMessage("message-2", "attachment-2"), { fileName: "Events_User_Flow.pdf", mimeType: "application/pdf", fileSize: 2048 });
  assert.equal(first.file_name, "Attachment (1).pdf");
  assert.equal(second.file_name, "Events_User_Flow.pdf");
});

test("normalizes cursor history and preserves safe hidden-message placeholders", () => {
  const visible = normalizeGroupChatMessage({ id: "visible", conversation_id: "group-1", sender_id: "user-1", sender_name: "User", sender_kind: "provider", message_type: "text", content: "Visible", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: {}, my_reactions: [], read_by: null, created_at: "2026-10-19T09:00:00Z" });
  const removed = normalizeGroupChatMessage({ id: "removed", conversation_id: "group-1", sender_id: "user-2", sender_name: "Admin", sender_kind: "provider", message_type: "text", content: "secret content", attachment_id: null, status: "removed_by_admin", placeholder: "Message removed by an administrator", reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: {}, my_reactions: [], read_by: null, created_at: "2026-10-19T09:01:00Z" });
  const history = normalizeGroupChatMessageHistory({ items: [visible, removed], has_more: true, next_cursor: "older-cursor", unread_count: 1, first_unread_message_id: "removed", pinned_count: 0 });
  assert.equal(history?.has_more, true);
  assert.equal(history?.next_cursor, "older-cursor");
  assert.equal(getGroupChatMessageDisplayText(removed!), "Message removed by an administrator");
  assert.notEqual(getGroupChatMessageDisplayText(removed!), "secret content");
});

test("builds text-message payloads and restores chronological order without duplicates", () => {
  assert.deepEqual(buildGroupChatTextMessagePayload(" Hello everyone "), { content: "Hello everyone" });
  assert.deepEqual(buildGroupChatTextMessagePayload("Thanks", " reply-1 "), { content: "Thanks", reply_to_id: "reply-1" });
  assert.equal(buildGroupChatTextMessagePayload("   "), null);
  const first = normalizeGroupChatMessage({ id: "first", conversation_id: "group-1", sender_id: "user-1", sender_name: "User", sender_kind: "provider", message_type: "text", content: "First", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: {}, my_reactions: [], read_by: null, created_at: "2026-10-19T09:00:00Z" })!;
  const second = { ...first, id: "second", content: "Second" };
  const duplicate = { ...first, content: "Updated first" };
  const pages = [
    { items: [second], has_more: true, next_cursor: "older", unread_count: 0, first_unread_message_id: null, pinned_count: 0 },
    { items: [duplicate], has_more: false, next_cursor: null, unread_count: 0, first_unread_message_id: null, pinned_count: 0 },
  ];
  assert.deepEqual(mergeGroupChatMessagePages(pages).map((message) => message.id), ["first", "second"]);
  assert.equal(mergeGroupChatMessagePages(pages)[0].content, "Updated first");
});

test("validates message edit and moderation payloads", () => {
  assert.deepEqual(buildEditGroupChatMessagePayload(" Updated text "), { content: "Updated text" });
  assert.equal(buildEditGroupChatMessagePayload("   "), null);
  assert.deepEqual(buildHideGroupChatMessagePayload(" Shared private contact information "), { reason: "Shared private contact information" });
  assert.equal(buildHideGroupChatMessagePayload("   "), null);
});

test("enforces message author, type, status, and edit-window eligibility", () => {
  const createdAt = "2026-10-21T09:00:00.000Z";
  const message = normalizeGroupChatMessage({ id: "message-1", conversation_id: "group-1", sender_id: "user-1", sender_name: "User", sender_kind: "provider", message_type: "text", content: "Original", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: {}, my_reactions: [], read_by: null, created_at: createdAt })!;
  const atFifteenMinutes = Date.parse(createdAt) + 15 * 60 * 1000;
  assert.equal(canEditGroupChatMessage(message, "user-1", atFifteenMinutes), true);
  assert.equal(canEditGroupChatMessage(message, "user-1", atFifteenMinutes + 1), false);
  assert.equal(canEditGroupChatMessage(message, "user-2", atFifteenMinutes), false);
  assert.equal(canEditGroupChatMessage({ ...message, status: "retracted" }, "user-1", atFifteenMinutes), false);
  assert.equal(canEditGroupChatMessage({ ...message, status: "removed_by_admin" }, "user-1", atFifteenMinutes), false);
  assert.equal(canRetractGroupChatMessage(message, "user-1"), true);
  assert.equal(canRetractGroupChatMessage({ ...message, status: "retracted" }, "user-1"), false);
  assert.equal(canEditGroupChatMessage({ ...message, message_type: "system" }, "user-1", atFifteenMinutes), false);
  assert.equal(canHideGroupChatMessage(message, true, "active"), true);
  assert.equal(canHideGroupChatMessage(message, false, "active"), false);
  assert.equal(canHideGroupChatMessage(message, true, "invited"), false);
  assert.equal(canHideGroupChatMessage({ ...message, message_type: "system" }, true, "active"), false);
});

test("treats timezone-less backend message timestamps as UTC for edit eligibility", () => {
  const createdAt = "2026-10-21T07:25:45.000000";
  const message = normalizeGroupChatMessage({ id: "message-utc", conversation_id: "group-1", sender_id: "user-1", sender_name: "User", sender_kind: "provider", message_type: "text", content: "Recent", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: {}, my_reactions: [], created_at: createdAt })!;
  const oneMinuteLater = Date.parse("2026-10-21T07:26:45.000Z");

  assert.equal(parseGroupChatMessageTimestamp(createdAt), Date.parse("2026-10-21T07:25:45.000Z"));
  assert.equal(parseGroupChatMessageTimestamp("2026-10-21T07:25:45.000000+05:30"), Date.parse("2026-10-21T01:55:45.000Z"));
  assert.equal(canEditGroupChatMessage(message, "user-1", oneMinuteLater), true);
  assert.equal(canEditGroupChatMessage(message, "user-1", Date.parse("2026-10-21T07:40:45.000Z")), true);
  assert.equal(canEditGroupChatMessage(message, "user-1", Date.parse("2026-10-21T07:40:45.001Z")), false);
});

test("normalizes complete mutation messages and treats acknowledgements as refresh-required", () => {
  const edited = normalizeGroupChatMessageMutationResponse({ id: "message-1", conversation_id: "group-1", sender_id: "user-1", sender_name: "User", sender_kind: "provider", message_type: "text", content: "Updated", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: true, edited_at: "2026-10-21T09:05:00Z", pinned: false, reactions: {}, my_reactions: [], read_by: null, created_at: "2026-10-21T09:00:00Z" });
  assert.equal(edited?.is_edited, true);
  assert.equal(edited?.content, "Updated");
  assert.equal(normalizeGroupChatMessageMutationResponse(undefined), null);
  assert.equal(normalizeGroupChatMessageMutationResponse({ ok: true }), null);
  const retracted = normalizeGroupChatMessageMutationResponse({ id: "message-1", conversation_id: "group-1", sender_id: "user-1", sender_name: "User", sender_kind: "provider", message_type: "text", content: "Original", attachment_id: null, status: "retracted", placeholder: "Message retracted", reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: {}, my_reactions: [], read_by: null, created_at: "2026-10-21T09:00:00Z" });
  assert.equal(getGroupChatMessageDisplayText(retracted!), "Message retracted");
  assert.notEqual(getGroupChatMessageDisplayText(retracted!), "Original");
});

test("uses only documented history pagination and backend posting permission", () => {
  assert.equal(buildGroupChatMessageHistoryQuery().toString(), "limit=50");
  assert.equal(buildGroupChatMessageHistoryQuery(25, " older cursor ").toString(), "limit=25&cursor=older+cursor");
  assert.equal(canSendGroupChatMessage("open", true), true);
  assert.equal(canSendGroupChatMessage("closed", true), false);
  assert.equal(canSendGroupChatMessage("open", false), false);
  assert.equal(canSendGroupChatMessage("open", null), false);
});

test("uses the correct Group Chat posting restriction priority", () => {
  assert.equal(getGroupChatPostingRestrictionMessage("closed", false, true), "This group is closed. It is read-only.");
  assert.equal(getGroupChatPostingRestrictionMessage("open", true, true), "You have been muted by the Group Owner.");
  assert.equal(getGroupChatPostingRestrictionMessage("open", false, false), "You cannot send messages in this group.");
  assert.equal(canSendGroupChatMessage("open", true, true), false);
});

test("normalizes backend reaction settings without inventing emojis", () => {
  assert.deepEqual(normalizeGroupChatReactionSettings({ enabled: true, emojis: ["👍", " ❤️ ", "", "abcdefghijklmnopq", "👍"] }), { enabled: true, emojis: ["👍", "❤️"] });
  assert.deepEqual(normalizeGroupChatReactionSettings({ enabled: false, emojis: [] }), { enabled: false, emojis: [] });
  assert.equal(normalizeGroupChatReactionSettings({ enabled: true }), null);
});

test("builds the exact reaction mutation body and encoded removal query", () => {
  assert.deepEqual(buildGroupChatReactionPayload(" 👍 "), { emoji: "👍" });
  assert.equal(buildGroupChatReactionPayload(""), null);
  assert.equal(buildGroupChatReactionPayload("12345678901234567"), null);
  const query = buildGroupChatReactionQuery("❤️");
  assert.equal(query?.get("emoji"), "❤️");
  assert.match(query?.toString() ?? "", /^emoji=/);
});

test("normalizes reaction counts and enforces visible non-system reaction controls", () => {
  const message = normalizeGroupChatMessage({ id: "reaction-message", conversation_id: "group-1", sender_id: "user-1", sender_name: "User", sender_kind: "provider", message_type: "text", content: "Hello", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: false, reactions: { "👍": 2.9, "❤️": -1, invalid: "3" }, my_reactions: [" 👍 ", "👍", ""], read_by: null, created_at: "2026-10-21T09:00:00Z" })!;
  assert.deepEqual(message.reactions, { "👍": 2 });
  assert.deepEqual(message.my_reactions, ["👍"]);
  assert.equal(canReactToGroupChatMessage(message), true);
  assert.equal(isGroupChatReactionSelected(message, "👍"), true);
  assert.equal(isGroupChatReactionSelected(message, "❤️"), false);
  assert.deepEqual(normalizeGroupChatReactionCounts({ "👏": 1, bad: null }), { "👏": 1 });
  assert.equal(canReactToGroupChatMessage({ message_type: "system", status: "visible" }), false);
  assert.equal(canReactToGroupChatMessage({ message_type: "text", status: "hidden" }), false);
});

test("pins only visible non-system messages for authorized Provider members", () => {
  const message = normalizeGroupChatMessage({ id: "pinned", conversation_id: "group-1", sender_id: "user-1", sender_name: "Provider", sender_kind: "provider", message_type: "text", content: "Important", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: true, reactions: {}, my_reactions: [], read_by: null, created_at: "2026-10-21T09:00:00Z" })!;
  assert.equal(message.pinned, true);
  assert.equal(canPinGroupChatMessage(message, true, "provider"), true);
  assert.equal(canPinGroupChatMessage(message, true, "learner"), false);
  assert.equal(canPinGroupChatMessage(message, false, "provider"), false);
  assert.equal(canPinGroupChatMessage({ ...message, status: "retracted" }, true, "provider"), false);
  assert.equal(canPinGroupChatMessage({ ...message, message_type: "system" }, true, "provider"), false);
});

test("normalizes the pinned-message list with existing privacy-safe message fields", () => {
  const response = normalizeGroupChatPinnedMessageHistory({ items: [{ id: "pinned", conversation_id: "group-1", sender_id: "user-1", sender_name: "Provider", sender_kind: "provider", message_type: "text", content: "Important", attachment_id: null, status: "visible", placeholder: null, reply_to: null, mentions: [], mentions_all: false, mentions_me: false, is_edited: false, edited_at: null, pinned: true, reactions: {}, my_reactions: [], read_by: null, created_at: "2026-10-21T09:00:00Z" }], has_more: false, next_cursor: null, unread_count: 0, first_unread_message_id: null, pinned_count: 1 });
  assert.equal(response?.pinned_count, 1);
  assert.equal(response?.items[0]?.pinned, true);
  assert.equal(normalizeGroupChatPinnedMessageHistory({ items: [], has_more: false }), null);
});

test("builds confirmed message-search and Shared Files queries", () => {
  assert.equal(buildGroupChatSearchQuery(" x "), null);
  assert.equal(buildGroupChatSearchQuery("  blood pressure  ")?.toString(), "q=blood+pressure&limit=50");
  assert.equal(buildGroupChatSearchQuery("term", 100)?.get("limit"), "100");
  assert.equal(buildGroupChatSearchQuery("term", 0), null);
  assert.equal(buildGroupChatSearchQuery("term", 101), null);
  assert.equal(buildGroupChatFilesQuery().toString(), "limit=100");
  assert.equal(buildGroupChatFilesQuery(200)?.get("limit"), "200");
  assert.equal(buildGroupChatFilesQuery(0), null);
  assert.equal(buildGroupChatFilesQuery(201), null);
});

test("keeps search idle until a valid query is submitted", () => {
  assert.equal(getGroupChatSearchViewState("", "", false, false, null), "idle");
  assert.equal(getGroupChatSearchViewState("x", "", false, false, null), "idle");
  assert.equal(getGroupChatSearchViewState("term", "", false, false, null), "idle");
  assert.equal(getGroupChatSearchViewState("term", "term", true, false, null), "loading");
  assert.equal(getGroupChatSearchViewState("term", "term", false, false, 0), "empty");
  assert.equal(getGroupChatSearchViewState("term", "term", false, false, 2), "results");
  assert.equal(getGroupChatSearchViewState("term", "term", false, true, null), "error");
});

test("does not leave cancelled or stale searches in a loading state", () => {
  assert.equal(getGroupChatSearchViewState("term", "term", false, false, null), "idle");
  assert.equal(getGroupChatSearchViewState("new term", "old term", false, false, 1), "idle");
  assert.equal(getGroupChatSearchViewState("new term", "new term", true, false, null), "loading");
});

test("normalizes the confirmed Shared Files response and rejects malformed records", () => {
  const item = { attachment_id: "attachment-1", message_id: "message-1", sender_id: "sender-1", file_name: "report.pdf", mime_type: "application/pdf", file_size: 123, attachment_type: "document", created_at: "2026-10-21T09:00:00Z" };
  const response = normalizeGroupChatSharedFilesResponse({ items: [item, { ...item, attachment_id: "attachment-2", file_name: "photo.webp", mime_type: "image/webp", attachment_type: "image" }, { ...item, attachment_id: "attachment-3", file_name: "meeting.mp4", mime_type: "video/mp4", attachment_type: "video" }] });
  assert.equal(response?.items.length, 3);
  assert.deepEqual(response?.items[0], item);
  assert.equal(response?.items[1]?.file_name, "photo.webp");
  assert.equal(response?.items[2]?.attachment_type, "video");
  assert.deepEqual(normalizeGroupChatSharedFilesResponse({ items: [item, { ...item, file_size: -1 }, null] }), { items: [item] });
  assert.deepEqual(normalizeGroupChatSharedFilesResponse({ items: [] }), { items: [] });
  assert.equal(normalizeGroupChatSharedFilesResponse([]), null);
  assert.equal(formatGroupChatSharedFileSize(123), "123 B");
  assert.equal(formatGroupChatSharedFileSize(1.34 * 1024 * 1024), "1.34 MB");
});

test("creates privacy-safe search previews for text, attachments and unavailable messages", () => {
  const base = {
    id: "search-message",
    conversation_id: "group-1",
    sender_id: "user-1",
    sender_name: "Provider",
    sender_kind: "provider",
    message_type: "text",
    content: "Visible text",
    attachment_id: null,
    status: "visible",
    placeholder: null,
    reply_to: null,
    mentions: [],
    mentions_all: false,
    mentions_me: false,
    is_edited: false,
    edited_at: null,
    pinned: false,
    reactions: {},
    my_reactions: [],
    read_by: null,
    created_at: "2026-10-21T09:00:00Z",
  };
  const text = normalizeGroupChatMessage(base)!;
  assert.equal(getGroupChatSafeMessagePreview(text), "Visible text");
  const image = normalizeGroupChatMessage({ ...base, message_type: "image", content: null, attachment_id: "attachment-1" })!;
  assert.equal(getGroupChatSafeMessagePreview(image), "Image attachment");
  const hidden = normalizeGroupChatMessage({ ...base, status: "hidden", content: "secret" })!;
  assert.equal(getGroupChatSafeMessagePreview(hidden), "Message unavailable.");
});

test("normalizes read status and resolves only authorized member names", () => {
  assert.equal(buildGroupChatMessageReadStatusPath("group/1", "message/1"), "/group%2F1/messages/message%2F1/read-status");
  assert.equal(buildGroupChatMessageReadStatusPath(" ", "message-1"), null);
  const status = normalizeGroupChatMessageReadStatus({
    message_id: "message-1",
    seen_by_count: 2,
    recipient_count: 3,
    label: "Seen by 2 members",
    seen_by: ["provider-1", "unknown-user", "provider-1"],
  });
  assert.deepEqual(status, {
    message_id: "message-1",
    seen_by_count: 2,
    recipient_count: 3,
    label: "Seen by 2 members",
    seen_by: ["provider-1", "unknown-user"],
  });
  assert.deepEqual(getGroupChatReadStatusMemberNames(status!, [{ user_id: "provider-1", name: "Provider One" }]), ["Provider One", "Group member"]);
  assert.deepEqual(normalizeGroupChatMessageReadStatus({ message_id: "message-1", seen_by_count: 0, recipient_count: 0, label: "Not seen", seen_by: [] })?.seen_by, []);
  assert.equal(normalizeGroupChatMessageReadStatus({ items: [] }), null);
});

test("enforces Group read-status eligibility and privacy restrictions", () => {
  const visible = { message_type: "text", status: "visible" } as const;
  assert.equal(canViewGroupChatReadStatus(visible, "program", "provider", "active"), true);
  assert.equal(canViewGroupChatReadStatus(visible, "program", "patient", "active"), false);
  assert.equal(canViewGroupChatReadStatus(visible, "program", "learner", "active"), false);
  assert.equal(canViewGroupChatReadStatus(visible, "care", "patient", "active"), true);
  assert.equal(canViewGroupChatReadStatus(visible, "care", "provider", "active"), true);
  assert.equal(canViewGroupChatReadStatus(visible, "unknown", "provider", "active"), false);
  assert.equal(canViewGroupChatReadStatus({ message_type: "system", status: "visible" }, "program", "provider", "active"), false);
  assert.equal(canViewGroupChatReadStatus({ message_type: "text", status: "retracted" }, "program", "provider", "active"), false);
  assert.equal(canViewGroupChatReadStatus(visible, "program", "provider", "invited"), false);
});

test("shows the read-status indicator only for eligible outgoing messages", () => {
  const message = { id: "message-1", sender_id: "provider-1", message_type: "text", status: "visible" } as GroupChatMessage;
  assert.equal(canShowGroupChatReadStatusIndicator(message, "provider-1", "program", "provider", "active"), true);
  assert.equal(canShowGroupChatReadStatusIndicator(message, "other-user", "program", "provider", "active"), false);
  assert.equal(canShowGroupChatReadStatusIndicator(message, "provider-1", "program", "patient", "active"), false);
  assert.equal(canShowGroupChatReadStatusIndicator({ ...message, status: "retracted" }, "provider-1", "program", "provider", "active"), false);
});

test("derives read ticks only from authoritative counts", () => {
  assert.equal(getGroupChatReadStatusTickState(null), "single");
  assert.equal(getGroupChatReadStatusTickState({ seen_by_count: 0, recipient_count: 1 }), "single");
  assert.equal(getGroupChatReadStatusTickState({ seen_by_count: 1, recipient_count: 3 }), "double-neutral");
  assert.equal(getGroupChatReadStatusTickState({ seen_by_count: 3, recipient_count: 3 }), "double-blue");
  assert.equal(getGroupChatReadStatusTickState({ seen_by_count: 4, recipient_count: 3 }), "double-blue");
  assert.equal(getGroupChatReadStatusTickState({ seen_by_count: 1, recipient_count: 0 }), "single");
});
