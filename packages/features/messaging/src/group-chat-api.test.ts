import assert from "node:assert/strict";
import test from "node:test";
import { buildCreateGroupPayload, buildGroupChatProviderVerificationCandidateQuery, buildGroupMemberInvitePayload, buildTransferGroupOwnershipPayload, buildVerifiedProviderPayload, formatGroupChatInvitationFeedback, isGroupChatLearnerSelectable, isGroupChatProviderDirectoryCandidate, isGroupChatProviderRegistrationCandidate, isGroupChatProviderSelectable, isGroupChatProviderUnavailableInCurrentGroup, isGroupChatProviderVerificationCandidate, isGroupChatTrainingSearchResultStale, normalizeGroupChatInvitation, normalizeGroupChatInvitationDetails, normalizeGroupChatMemberEligibility, normalizeGroupChatProviderVerificationCandidate, normalizeGroupChatVerifiedProvider, remainingGroupChatMemberSlots, resolveGroupChatOwnerName, resolveGroupChatVerifiedProviderName } from "./group-chat-models.ts";
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

test("conversation_id-only invitations support detail lookup and group actions", () => {
  assert.deepEqual(normalizeGroupChatInvitation({ conversation_id: "conversation-1", name: "groupchat1 Discuss", kind: "program", description: "description loaded", requires_guardian_consent: false }), {
    id: "conversation-1",
    group_id: "conversation-1",
    group_name: "groupchat1 Discuss",
    description: "description loaded",
    invited_by_name: null,
    status: "pending",
    created_at: null,
    member_names: [],
    visibility_notice: null,
    emergency_notice: null,
    guardian_consent_required: false,
  });
});

test("invitation parsing keeps explicit invitation and group identifiers separate", () => {
  assert.deepEqual(normalizeGroupChatInvitation({ invitation_id: "invitation-1", group_id: "group-1", group_name: "Wellness cohort", status: "pending" }), {
    id: "invitation-1",
    group_id: "group-1",
    group_name: "Wellness cohort",
    description: null,
    invited_by_name: null,
    status: "pending",
    created_at: null,
    member_names: [],
    visibility_notice: null,
    emergency_notice: null,
    guardian_consent_required: false,
  });
  assert.equal(normalizeGroupChatInvitation({ invitation_id: "invitation-without-group" }), null);
  assert.equal(normalizeGroupChatInvitation({ group_id: "group-without-invitation" }), null);
});

test("nested invitation details can use the top-level group identifier", () => {
  assert.deepEqual(normalizeGroupChatInvitationDetails({
    group_id: "group-2",
    invitation: { invitation_id: "invitation-2", group_name: "Provider cohort", requires_guardian_consent: true },
    purpose: "Care coordination",
    provider_names: ["Provider One"],
  }), {
    id: "invitation-2",
    group_id: "group-2",
    group_name: "Provider cohort",
    description: null,
    invited_by_name: null,
    status: "pending",
    created_at: null,
    member_names: [],
    visibility_notice: null,
    emergency_notice: null,
    guardian_consent_required: true,
    purpose: "Care coordination",
    provider_names: ["Provider One"],
    what_members_can_see: null,
    guardian_consent_text: null,
  });
});

test("nested conversation_id remains the detail and group-action identifier when explicit IDs are absent", () => {
  const result = normalizeGroupChatInvitationDetails({
    invitation: { conversation_id: "conversation-2", name: "Provider cohort" },
    requires_guardian_consent: false,
  });
  assert.equal(result?.id, "conversation-2");
  assert.equal(result?.group_id, "conversation-2");
});

test("invitation details support the existing response envelope", () => {
  const result = normalizeGroupChatInvitationDetails({
    data: { invitation: { id: "invitation-3", group_id: "group-3", group_name: "Care cohort" } },
  });
  assert.equal(result?.id, "invitation-3");
  assert.equal(result?.group_id, "group-3");
});

test("verified Provider registry entries preserve the real user ID and safe name handling", () => {
  assert.deepEqual(normalizeGroupChatVerifiedProvider({ user_id: "provider-1", display_name: "Provider One", email: "provider@example.test" }), {
    user_id: "provider-1",
    display_name: "Provider One",
    email: "provider@example.test",
    verified_at: null,
  });
  assert.deepEqual(normalizeGroupChatVerifiedProvider({ user_id: "provider-2" }), {
    user_id: "provider-2",
    display_name: null,
    email: null,
    verified_at: null,
  });
  assert.equal(normalizeGroupChatVerifiedProvider({ display_name: "Missing ID" }), null);
});

test("backend verified Provider names take precedence over the authorized directory", () => {
  const provider = normalizeGroupChatVerifiedProvider({ user_id: "provider-2" });
  assert.ok(provider);
  const members = [
    { userId: "provider-1", fullName: "First Provider" },
    { userId: "provider-2", fullName: "Enzo Provider" },
  ];
  assert.equal(resolveGroupChatVerifiedProviderName(provider, members as never), "Enzo Provider");
  assert.equal(resolveGroupChatVerifiedProviderName({ ...provider, display_name: "Registry Name" }, members as never), "Registry Name");
  assert.equal(resolveGroupChatVerifiedProviderName({ ...provider, display_name: null }, []), null);
});

test("verified Provider name resolution is safe while the directory is loading or incomplete", () => {
  const provider = { user_id: "provider-1", display_name: "Registry Name", email: null, verified_at: null };
  assert.equal(resolveGroupChatVerifiedProviderName(provider), "Registry Name");
  assert.equal(resolveGroupChatVerifiedProviderName(provider, []), "Registry Name");
  assert.equal(resolveGroupChatVerifiedProviderName({ ...provider, display_name: null }, [{ userId: "other", fullName: "Other Provider" }] as never), null);
  assert.equal(resolveGroupChatVerifiedProviderName(provider, [{ userId: "provider-1", fullName: "   " }] as never), "Registry Name");
  assert.equal(resolveGroupChatVerifiedProviderName(provider, [{ userId: "provider-1" }] as never), "Registry Name");
  assert.equal(resolveGroupChatVerifiedProviderName(provider, [{ userId: "provider-1", fullName: "Loaded Provider" }] as never), "Registry Name");
  assert.equal(resolveGroupChatVerifiedProviderName({ ...provider, display_name: null, email: "provider@example.test" }, []), null);
});

test("owner name resolution prefers genuine stored names over generic placeholders", () => {
  assert.equal(resolveGroupChatOwnerName("Enterprise Owner", "Group member"), "Enterprise Owner");
  assert.equal(resolveGroupChatOwnerName("Group member", "Directory Owner"), "Directory Owner");
  assert.equal(resolveGroupChatOwnerName(null, "Group member"), null);
  assert.equal(resolveGroupChatOwnerName("  ", null), null);
});

test("Provider verification always accepts user_id and omits blank optional details", () => {
  assert.deepEqual(buildVerifiedProviderPayload(" provider-1 "), { user_id: "provider-1" });
  assert.deepEqual(buildVerifiedProviderPayload(" provider-1 ", " REG-123 ", " Medical Council "), {
    user_id: "provider-1",
    registration_number: "REG-123",
    registration_council: "Medical Council",
  });
  assert.deepEqual(buildVerifiedProviderPayload("provider-1", " REG-123 ", ""), {
    user_id: "provider-1",
    registration_number: "REG-123",
  });
  assert.deepEqual(buildVerifiedProviderPayload("provider-1", "", " Medical Council "), {
    user_id: "provider-1",
    registration_council: "Medical Council",
  });
  assert.equal(buildVerifiedProviderPayload("   ", "REG-123", "Medical Council"), null);
});

test("Provider directory candidates include active internal, tenant admin, and tenant owner accounts without broad role fallback", () => {
  const base = { status: "active", role: "internal_user", roleSlug: "internal_user", tenantRbacRoles: [] };
  assert.equal(isGroupChatProviderDirectoryCandidate(base), true);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, role: "tenant_admin", roleSlug: "tenant_admin" }), true);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, role: "unknown_role", roleSlug: "unknown_role", tenantRbacRoles: ["tenant_admin"] }), true);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, status: "inactive" }), false);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, status: "removed", role: "tenant_admin", roleSlug: "tenant_admin" }), false);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, role: "tenant_owner", roleSlug: "tenant_owner", tenantRbacRoles: ["enterprise_admin", "tenant_owner"] }), true);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, status: "inactive", role: "tenant_owner", roleSlug: "tenant_owner" }), false);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, role: "external_user", roleSlug: "external_user" }), false);
  assert.equal(isGroupChatProviderDirectoryCandidate({ ...base, role: "unknown_role", roleSlug: "unknown_role", tenantRbacRoles: [] }), false);
});

test("Provider verification uses the tenant member global user ID", () => {
  assert.deepEqual(buildVerifiedProviderPayload(" global-user-id "), { user_id: "global-user-id" });
});

test("Provider registration excludes already verified global user IDs", () => {
  const member = { userId: "global-user-id", status: "active", role: "tenant_admin", roleSlug: "tenant_admin", tenantRbacRoles: [] };
  assert.equal(isGroupChatProviderRegistrationCandidate(member, new Set()), true);
  assert.equal(isGroupChatProviderRegistrationCandidate(member, new Set(["global-user-id"])), false);
  assert.equal(isGroupChatProviderRegistrationCandidate({ ...member, userId: "membership-id" }, new Set(["global-user-id"])), true);
});

test("Group member eligibility flags preserve explicit backend values and fail closed", () => {
  assert.deepEqual(normalizeGroupChatMemberEligibility({ is_verified_provider: true, can_be_admin: true, can_receive_ownership: false }), {
    is_verified_provider: true,
    can_be_admin: true,
    can_receive_ownership: false,
  });
  assert.deepEqual(normalizeGroupChatMemberEligibility({ is_verified_provider: "true", can_be_admin: 1 }), {
    is_verified_provider: null,
    can_be_admin: null,
    can_receive_ownership: null,
  });
});

test("verification candidates require the explicit not_verified state", () => {
  assert.equal(isGroupChatProviderVerificationCandidate({ verification: "not_verified" }), true);
  assert.equal(isGroupChatProviderVerificationCandidate({ verification: "verified" }), false);
  assert.equal(isGroupChatProviderVerificationCandidate({ verification: null }), false);
});

test("verification candidate normalization preserves roles and pagination fields", () => {
  assert.deepEqual(normalizeGroupChatProviderVerificationCandidate({ user_id: "owner-user", name: "Enterprise Owner", roles: ["tenant_owner"], verification: "not_verified", registration_number: null }), {
    user_id: "owner-user",
    name: "Enterprise Owner",
    roles: ["tenant_owner"],
    verification: "not_verified",
    registration_number: null,
  });
  assert.equal(normalizeGroupChatProviderVerificationCandidate({ name: "Missing user" }), null);
});

test("verification candidate requests include all_roles and pagination", () => {
  assert.equal(buildGroupChatProviderVerificationCandidateQuery(2, 50).toString(), "all_roles=true&page=2&page_size=50");
});

test("Provider eligibility is scoped to the current Group Chat membership status", () => {
  const members = [
    { user_id: "active-provider", membership_status: "active" },
    { user_id: "pending-provider", membership_status: "invited" },
    { user_id: "declined-provider", membership_status: "declined" },
    { user_id: "removed-provider", membership_status: "removed" },
  ];
  assert.equal(isGroupChatProviderUnavailableInCurrentGroup("active-provider", members), true);
  assert.equal(isGroupChatProviderUnavailableInCurrentGroup("pending-provider", members), true);
  assert.equal(isGroupChatProviderUnavailableInCurrentGroup("declined-provider", members), false);
  assert.equal(isGroupChatProviderUnavailableInCurrentGroup("removed-provider", members), false);
  assert.equal(isGroupChatProviderUnavailableInCurrentGroup("provider-in-another-group", members), false);
});

test("Training search marks previous results stale during debounce and background fetching", () => {
  assert.equal(isGroupChatTrainingSearchResultStale("heal", "hea", true, false, false, false), true);
  assert.equal(isGroupChatTrainingSearchResultStale("hea", "hea", true, true, true, false), true);
  assert.equal(isGroupChatTrainingSearchResultStale("hea", "hea", true, false, false, false), false);
});

test("Training search keeps stale results unselectable after an error and handles empty searches safely", () => {
  assert.equal(isGroupChatTrainingSearchResultStale("", "", true, false, false, false), false);
  assert.equal(isGroupChatTrainingSearchResultStale("missing", "missing", true, false, false, true), true);
  assert.equal(isGroupChatTrainingSearchResultStale("missing", "missing", false, false, false, true), false);
});

test("invitation feedback uses actual learner and Provider outcomes", () => {
  assert.equal(formatGroupChatInvitationFeedback("learner", { invited: ["learner-1"], skipped: [] }), "1 learner invited successfully.");
  assert.equal(formatGroupChatInvitationFeedback("Provider", { invited: ["provider-1", "provider-2"], skipped: [] }), "2 Providers invited successfully.");
  assert.equal(formatGroupChatInvitationFeedback("learner", { invited: ["learner-1"], skipped: ["learner-2"] }), "1 learner invited successfully. 1 skipped.");
  assert.equal(formatGroupChatInvitationFeedback("Provider", { invited: [], skipped: ["provider-1", "provider-2"] }), "No Providers were invited. 2 skipped.");
  assert.equal(formatGroupChatInvitationFeedback("learner", { invited: [], skipped: [] }), null);
});

test("ownership transfer uses the documented target user payload", () => {
  assert.deepEqual(buildTransferGroupOwnershipPayload(" provider-user "), { user_id: "provider-user" });
  assert.equal(buildTransferGroupOwnershipPayload(""), null);
});
