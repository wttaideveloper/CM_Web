import type { TrainingListItem } from "@ihp/enterprise-trainings";
import type { TenantMember } from "@ihp/enterprise-runtime";
import type { CreateGroupPayload, GroupChatInvitation, GroupChatInvitationDetails, GroupChatInvitee, GroupChatLearner as ApiGroupChatLearner, GroupChatMember, GroupChatPermissions, GroupChatProvider as ApiGroupChatProvider, InviteMembersPayload, UpdateGroupDetailsPayload, UpdateGroupSettingsPayload } from "./group-chat/group-chat.types";

export type GroupChatView = "conversation" | "members" | "settings";
export type GroupRole = "Owner" | "Admin" | "Member";
export type MembershipStatus = "active" | "pending" | "removed";
export type ProviderVerificationStatus = "verified" | "unverified" | "unavailable";
export type MemberManagementAction = "make-admin" | "remove-admin" | "remove-member";

export type GroupLearner = {
  id: string;
  name: string;
  email: string;
  status: string;
  eligible: boolean;
};

export type GroupProvider = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type GroupDraft = {
  training: TrainingListItem | null;
  learners: GroupLearner[];
  providers: GroupProvider[];
  name: string;
  description: string;
  postingPermission: "admins" | "members";
  capacity: number;
};

export type PreviewGroupMember = {
  id: string;
  name: string;
  role: GroupRole;
  kind: "learner" | "provider";
  membershipStatus: MembershipStatus;
  providerVerificationStatus?: ProviderVerificationStatus;
};

export const PREVIEW_GROUP_MEMBERS: PreviewGroupMember[] = [
  { id: "preview-owner", name: "Group owner", role: "Owner", kind: "provider", membershipStatus: "active", providerVerificationStatus: "verified" },
  { id: "preview-provider", name: "Training provider", role: "Member", kind: "provider", membershipStatus: "active", providerVerificationStatus: "unavailable" },
  { id: "preview-verified-provider", name: "Verified provider (preview)", role: "Member", kind: "provider", membershipStatus: "active", providerVerificationStatus: "verified" },
  { id: "preview-learner-one", name: "Enrolled learner", role: "Member", kind: "learner", membershipStatus: "active" },
];

/** Returns the locally previewed actions available to the current group role. */
export function getMemberManagementActions(viewerRole: GroupRole, member: PreviewGroupMember): readonly MemberManagementAction[] {
  if (member.membershipStatus !== "active" || member.role === "Owner") return [];
  if (viewerRole === "Member") return [];
  if (viewerRole === "Admin") return member.role === "Member" ? ["remove-member"] : [];
  if (member.role === "Admin") return ["remove-admin", "remove-member"];
  if (member.kind === "provider" && member.providerVerificationStatus === "verified") return ["make-admin", "remove-member"];
  return ["remove-member"];
}

/** Applies a mock-only membership action without contacting a backend service. */
export function applyPreviewMemberAction(members: readonly PreviewGroupMember[], memberId: string, action: MemberManagementAction): PreviewGroupMember[] {
  if (action === "remove-member") return members.filter((member) => member.id !== memberId);

  return members.map((member) => {
    if (member.id !== memberId || member.role === "Owner") return member;
    return { ...member, role: action === "make-admin" ? "Admin" : "Member" };
  });
}

/** Returns whether the backend has authorized a learner for a future invitation. */
export function isGroupChatLearnerSelectable(learner: ApiGroupChatLearner): boolean {
  return Boolean(learner.user_id && learner.can_invite);
}

/** Returns whether a Provider can be selected as an additional group member. */
export function isGroupChatProviderSelectable(provider: ApiGroupChatProvider): boolean {
  return Boolean(provider.user_id && !provider.is_me);
}

/** Calculates additional member capacity after reserving the group owner slot. */
export function remainingGroupChatMemberSlots(maxMembers: number, selectedCount: number): number {
  return Math.max(0, Math.max(1, maxMembers) - 1 - Math.max(0, selectedCount));
}

/** Identifies the backend status used for an outgoing invitation not yet accepted. */
export function isGroupChatPendingMember(member: Pick<GroupChatMember, "membership_status">): boolean {
  return member.membership_status.trim().toLowerCase() === "invited";
}

/** Splits a visible member response without treating pending invitees as active members. */
export function splitGroupChatMembers(members: readonly GroupChatMember[]): { active: GroupChatMember[]; pending: GroupChatMember[] } {
  return members.reduce<{ active: GroupChatMember[]; pending: GroupChatMember[] }>((result, member) => {
    (isGroupChatPendingMember(member) ? result.pending : result.active).push(member);
    return result;
  }, { active: [], pending: [] });
}

/** Returns an authorized name or a status-specific privacy-safe fallback. */
export function getGroupChatMemberDisplayName(name: string | null | undefined, membershipStatus: string, memberKind: string | null | undefined): string {
  if (name?.trim()) return name.trim();
  if (membershipStatus.trim().toLowerCase() !== "invited") return "Group member";
  const normalizedKind = memberKind?.trim().toLowerCase() ?? "";
  if (normalizedKind === "provider") return "Invited Provider";
  if (normalizedKind === "patient" || normalizedKind === "learner") return "Invited learner";
  return "Invited member";
}

/** Normalizes one received invitation without treating its invitation ID as its group ID. */
export function normalizeGroupChatInvitation(value: unknown): GroupChatInvitation | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id", "invitation_id");
  const group = isRecord(value.group) ? value.group : {};
  const groupId = readString(value, "group_id") || readString(group, "id", "group_id");
  if (!id || !groupId) return null;
  const memberNames = Array.isArray(value.member_names) ? value.member_names.filter((name): name is string => typeof name === "string" && Boolean(name.trim())).map((name) => name.trim()) : [];
  return {
    id,
    group_id: groupId,
    group_name: readString(value, "group_name", "name") || "Group invitation",
    description: readString(value, "description") || null,
    invited_by_name: readString(value, "invited_by_name", "inviter_name") || null,
    status: readString(value, "status") || "pending",
    created_at: readString(value, "created_at") || null,
    member_names: memberNames,
    visibility_notice: readString(value, "visibility_notice") || null,
    emergency_notice: readString(value, "emergency_notice") || null,
    guardian_consent_required: value.guardian_consent_required === true || value.requires_guardian_consent === true,
  };
}

/** Normalizes invitation details while preserving the separately supplied group ID. */
export function normalizeGroupChatInvitationDetails(value: unknown): GroupChatInvitationDetails | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.data) ? value.data : isRecord(value.result) ? value.result : value;
  const nestedInvitation = isRecord(source.invitation) ? source.invitation : null;
  const outerGroup = isRecord(source.group) ? source.group : null;
  const invitationSource = nestedInvitation
    ? {
        ...nestedInvitation,
        group_id: nestedInvitation.group_id ?? source.group_id ?? outerGroup?.id ?? outerGroup?.group_id,
      }
    : source;
  const invitation = normalizeGroupChatInvitation(invitationSource);
  if (!invitation) return null;
  const providerNames = Array.isArray(source.provider_names) ? source.provider_names.filter((name): name is string => typeof name === "string" && Boolean(name.trim())).map((name) => name.trim()) : [];
  return {
    ...invitation,
    purpose: readString(source, "purpose") || null,
    provider_names: providerNames,
    what_members_can_see: readString(source, "what_members_can_see") || null,
    guardian_consent_text: readString(source, "guardian_consent_text") || null,
  };
}

/** Returns whether the authenticated user may close an open Group Chat. */
export function canCloseGroupChat(input: { status: string | null; my_role: string | null; permissions: Pick<GroupChatPermissions, "can_close_group"> }): boolean {
  if (input.status?.trim().toLowerCase() === "closed") return false;
  const role = input.my_role?.trim().toLowerCase();
  if (role === "owner") return input.permissions.can_close_group !== false;
  return role === "admin" && input.permissions.can_close_group === true;
}

/** Returns whether the authenticated user may edit open Group Chat details. */
export function canEditGroupChat(input: { status: string | null; my_role: string | null; permissions: Pick<GroupChatPermissions, "can_manage_group" | "can_edit_group"> }): boolean {
  if (input.status?.trim().toLowerCase() === "closed") return false;
  if (input.my_role?.trim().toLowerCase() === "owner") return true;
  return input.permissions.can_manage_group === true && input.permissions.can_edit_group === true;
}

/** Returns whether the authenticated user may update open Group Chat posting settings. */
export function canUpdateGroupChatSettings(input: { status: string | null; my_role: string | null; permissions: Pick<GroupChatPermissions, "can_manage_group" | "can_update_settings"> }): boolean {
  if (input.status?.trim().toLowerCase() === "closed") return false;
  if (input.my_role?.trim().toLowerCase() === "owner") return true;
  return input.permissions.can_manage_group === true && input.permissions.can_update_settings === true;
}

/** Builds the minimal PATCH payload for editable Group Chat details. */
export function buildUpdateGroupDetailsPayload(name: string, description: string): UpdateGroupDetailsPayload {
  return { name: name.trim(), description: description.trim() };
}

/** Builds the minimal PATCH payload for Group Chat posting permissions. */
export function buildUpdateGroupSettingsPayload(adminsOnlyPosting: boolean): UpdateGroupSettingsPayload {
  return { admins_only_posting: adminsOnlyPosting };
}

/** Builds the server-owned Training Group creation payload from selected user IDs. */
export function buildCreateGroupPayload(input: { name: string; contextId: string; description: string; userIds: readonly string[]; adminsOnlyPosting: boolean }): CreateGroupPayload {
  const userIds = [...new Set(input.userIds.map((id) => id.trim()).filter(Boolean))];
  return {
    name: input.name.trim(),
    kind: "program",
    context_type: "training",
    context_id: input.contextId,
    description: input.description.trim(),
    invitees: userIds.map((user_id) => ({ user_id })),
    admins_only_posting: input.adminsOnlyPosting,
  };
}

/** Builds the documented additional-member invitation payload without inventing member data. */
export function buildGroupMemberInvitePayload(invitees: readonly GroupChatInvitee[]): InviteMembersPayload {
  const normalized = new Map<string, GroupChatInvitee>();
  for (const invitee of invitees) {
    const userId = invitee.user_id.trim();
    if (!userId) continue;
    const displayName = invitee.display_name?.trim();
    normalized.set(userId, {
      user_id: userId,
      ...(displayName ? { display_name: displayName } : {}),
      ...(invitee.is_minor === undefined ? {} : { is_minor: invitee.is_minor }),
    });
  }
  return { invitees: [...normalized.values()] };
}

function readString(value: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEligibleStatus(status: string): boolean {
  return !["cancelled", "canceled", "rejected", "withdrawn", "removed", "expired"].includes(status.toLowerCase());
}

/** Converts the existing Training enrolment response into safe, displayable preview data. */
export function normalizeGroupLearner(value: unknown, index: number): GroupLearner | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id", "enrolment_id", "enrollment_id", "user_id", "participant_id");
  const name = readString(value, "participant_name", "full_name", "fullName", "name", "user_name");
  const email = readString(value, "participant_email", "email", "user_email");
  const status = readString(value, "status", "enrolment_status", "enrollment_status") || "enrolled";
  if (!id && !name && !email) return null;
  return {
    id: id || `learner-${index}`,
    name: name || "Enrolled learner",
    email,
    status,
    eligible: isEligibleStatus(status),
  };
}

/** Converts the existing tenant member response into a provider candidate. */
export function normalizeGroupProvider(member: TenantMember): GroupProvider | null {
  const role = (member.roleSlug || member.role || "").toLowerCase();
  if (!role.includes("provider")) return null;
  return { id: member.userId, name: member.fullName, role: member.roleName || member.roleSlug, email: member.email };
}
