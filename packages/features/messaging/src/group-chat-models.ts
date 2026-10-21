import type { TrainingListItem } from "@ihp/enterprise-trainings";
import type { TenantMember } from "@ihp/enterprise-runtime";
import type { ChangeGroupMemberRolePayload, CreateGroupPayload, EditGroupChatMessagePayload, GroupAvatarUploadResponse, GroupChatInvitation, GroupChatInvitationDetails, GroupChatInvitationResult, GroupChatInvitee, GroupChatLearner as ApiGroupChatLearner, GroupChatMember, GroupChatMemberPostingMutePayload, GroupChatMemberRole, GroupChatMessage, GroupChatMessageHistoryResponse, GroupChatPermissions, GroupChatProvider as ApiGroupChatProvider, GroupChatProviderVerificationCandidate, GroupChatVerifiedProvider, HideGroupChatMessagePayload, InviteMembersPayload, RegisterGroupChatVerifiedProviderPayload, ReopenGroupPayload, SendGroupChatMessagePayload, TransferGroupOwnershipPayload, UpdateGroupDetailsPayload, UpdateGroupSettingsPayload } from "./group-chat/group-chat.types";

export type GroupChatView = "conversation" | "members" | "settings";
export type GroupRole = "Owner" | "Admin" | "Member";
export type MembershipStatus = "active" | "invited" | "pending" | "removed" | "left" | "declined";
export type ProviderVerificationStatus = "verified" | "unverified" | "unavailable";
export type MemberManagementAction = "make-admin" | "remove-admin" | "remove-member";
/** Actions available in the live Group Chat member-role menu. */
export type GroupChatMemberRoleAction = "make-admin" | "remove-admin";
/** Actions available for active members and pending invitations. */
export type GroupChatMemberAction = GroupChatMemberRoleAction | "remove-member" | "cancel-invitation" | "mute-posting" | "unmute-posting" | "transfer-ownership";
export type GroupChatMemberPostingAction = "mute-posting" | "unmute-posting";

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

/** Prevents a previous Training result set from being selected for a newer search. */
export function isGroupChatTrainingSearchResultStale(rawSearch: string, debouncedSearch: string, hasData: boolean, isFetching: boolean, isPlaceholderData: boolean, isError: boolean): boolean {
  if (!hasData) return false;
  return rawSearch.trim() !== debouncedSearch.trim() || isFetching || isPlaceholderData || isError;
}

/** Formats invitation outcome counts without claiming skipped entries were successful. */
export function formatGroupChatInvitationFeedback(kind: "learner" | "Provider", result: GroupChatInvitationResult): string | null {
  const invitedCount = result.invited.length;
  const skippedCount = result.skipped.length;
  const noun = kind === "Provider" ? (invitedCount === 1 ? "Provider" : "Providers") : (invitedCount === 1 ? "learner" : "learners");
  if (invitedCount > 0) {
    const success = `${invitedCount} ${noun} invited successfully.`;
    return skippedCount > 0 ? `${success} ${skippedCount} skipped.` : success;
  }
  if (skippedCount > 0) return `No ${kind === "Provider" ? "Providers" : "learners"} were invited. ${skippedCount} skipped.`;
  return null;
}

/** Identifies the backend status used for an outgoing invitation not yet accepted. */
export function isGroupChatPendingMember(member: Pick<GroupChatMember, "membership_status">): boolean {
  const status = member.membership_status.trim().toLowerCase();
  return status === "invited" || status === "pending";
}

/** Splits a visible member response while keeping removed and unknown statuses out of Active Members. */
export function splitGroupChatMembers(members: readonly GroupChatMember[]): { active: GroupChatMember[]; pending: GroupChatMember[]; excluded: GroupChatMember[] } {
  return members.reduce<{ active: GroupChatMember[]; pending: GroupChatMember[]; excluded: GroupChatMember[] }>((result, member) => {
    const status = member.membership_status.trim().toLowerCase();
    if (status === "active") result.active.push(member);
    else if (isGroupChatPendingMember(member)) result.pending.push(member);
    else result.excluded.push(member);
    return result;
  }, { active: [], pending: [], excluded: [] });
}

/** Returns backend-authorized role actions for one active member. */
export function getGroupChatMemberRoleActions(
  member: GroupChatMember,
  permissions: Pick<GroupChatPermissions, "can_make_admin" | "can_remove_admin">,
  activeMembers: readonly GroupChatMember[],
  ownerUserId: string | null,
): readonly GroupChatMemberRoleAction[] {
  const status = member.membership_status.trim().toLowerCase();
  const role = member.role.trim().toLowerCase();
  const isOwner = role === "owner" || (Boolean(member.user_id) && member.user_id === ownerUserId);
  if (status !== "active" || isOwner || !member.user_id || member.can_manage === false) return [];

  if (role === "admin") return permissions.can_remove_admin === true ? ["remove-admin"] : [];
  if (role !== "member") return [];

  const activeAdminCount = activeMembers.filter((candidate) => candidate.membership_status.trim().toLowerCase() === "active" && candidate.role.trim().toLowerCase() === "admin" && candidate.user_id !== ownerUserId).length;
  if (permissions.can_make_admin !== true || member.can_be_admin !== true || activeAdminCount >= 3) return [];
  return ["make-admin"];
}

/** Returns ownership transfer only for an active, verified Provider in an open group. */
export function getGroupChatMemberOwnershipAction(
  member: GroupChatMember,
  permissions: Pick<GroupChatPermissions, "can_transfer_ownership">,
  ownerUserId: string | null,
  groupStatus: string | null,
): "transfer-ownership" | null {
  const status = member.membership_status.trim().toLowerCase();
  const role = member.role.trim().toLowerCase();
  const isOwner = role === "owner" || (Boolean(member.user_id) && member.user_id === ownerUserId);
  const userId = member.user_id;
  if (permissions.can_transfer_ownership !== true || groupStatus?.trim().toLowerCase() !== "open" || status !== "active" || isOwner || !userId || member.can_receive_ownership !== true) return null;
  return "transfer-ownership";
}

/** Returns the conservative removal action for one active member or pending invitation. */
export function getGroupChatMemberRemovalAction(
  member: GroupChatMember,
  permissions: Pick<GroupChatPermissions, "can_remove_members">,
  ownerUserId: string | null,
): "remove-member" | "cancel-invitation" | null {
  const status = member.membership_status.trim().toLowerCase();
  const role = member.role.trim().toLowerCase();
  const isOwner = role === "owner" || (Boolean(member.user_id) && member.user_id === ownerUserId);
  if (permissions.can_remove_members !== true || !member.user_id || member.is_current_user || isOwner) return null;
  if (status === "active") {
    if (role !== "member" || member.can_manage === false) return null;
    return "remove-member";
  }
  if (isGroupChatPendingMember(member) && role !== "admin") return "cancel-invitation";
  return null;
}

/** Returns a posting-mute action only when the backend supplied a known mute state. */
export function getGroupChatMemberPostingAction(
  member: GroupChatMember,
  permissions: Pick<GroupChatPermissions, "can_mute_members">,
  ownerUserId: string | null,
): GroupChatMemberPostingAction | null {
  const status = member.membership_status.trim().toLowerCase();
  const role = member.role.trim().toLowerCase();
  const isOwner = role === "owner" || (Boolean(member.user_id) && member.user_id === ownerUserId);
  if (permissions.can_mute_members !== true || status !== "active" || !member.user_id || member.is_current_user || isOwner || typeof member.posting_muted !== "boolean") return null;
  return member.posting_muted ? "unmute-posting" : "mute-posting";
}

/** Normalizes only the confirmed member posting-mute fields with unknown default semantics. */
export function normalizeGroupChatMemberPostingMute(value: unknown): Pick<GroupChatMember, "posting_muted" | "posting_muted_until"> {
  if (!isRecord(value)) return { posting_muted: null, posting_muted_until: null };
  const postingMuted = typeof value.posting_muted === "boolean" ? value.posting_muted : null;
  const postingMutedUntil = typeof value.posting_muted_until === "string" && value.posting_muted_until.trim() ? value.posting_muted_until.trim() : null;
  return { posting_muted: postingMuted, posting_muted_until: postingMutedUntil };
}

/** Preserves only explicit member eligibility flags; absent or malformed values remain denied. */
export function normalizeGroupChatMemberEligibility(value: unknown): Pick<GroupChatMember, "is_verified_provider" | "can_be_admin" | "can_receive_ownership"> {
  if (!isRecord(value)) return { is_verified_provider: null, can_be_admin: null, can_receive_ownership: null };
  return {
    is_verified_provider: typeof value.is_verified_provider === "boolean" ? value.is_verified_provider : null,
    can_be_admin: typeof value.can_be_admin === "boolean" ? value.can_be_admin : null,
    can_receive_ownership: typeof value.can_receive_ownership === "boolean" ? value.can_receive_ownership : null,
  };
}

/** Builds the documented basic mute body without inventing an expiry or reason. */
export function buildGroupChatMemberMutePayload(): GroupChatMemberPostingMutePayload {
  return {};
}

/** Builds the exact role-change payload and enforces the client-side reason requirement for demotion. */
export function buildChangeGroupMemberRolePayload(role: GroupChatMemberRole, reason = ""): ChangeGroupMemberRolePayload | null {
  if (role === "admin") return { role: "admin" };
  const normalizedReason = reason.trim();
  return normalizedReason ? { role: "member", reason: normalizedReason } : null;
}

/** Builds the exact ownership-transfer request body and rejects missing target IDs. */
export function buildTransferGroupOwnershipPayload(userId: string): TransferGroupOwnershipPayload | null {
  const normalizedUserId = userId.trim();
  return normalizedUserId ? { user_id: normalizedUserId } : null;
}

/** Builds the optional, URL-encoded reason query for member removal or invitation cancellation. */
export function buildGroupMemberRemovalQuery(reason = ""): URLSearchParams {
  const query = new URLSearchParams();
  const normalizedReason = reason.trim();
  if (normalizedReason) query.set("reason", normalizedReason);
  return query;
}

/** Returns whether a Provider is already active or invited in this specific Group Chat. */
export function isGroupChatProviderUnavailableInCurrentGroup(providerUserId: string, members: readonly Pick<GroupChatMember, "user_id" | "membership_status">[]): boolean {
  return members.some((member) => {
    const status = member.membership_status?.trim().toLowerCase();
    return member.user_id === providerUserId && (status === "active" || status === "invited" || status === "pending");
  });
}

/** Returns an authorized name or a status-specific privacy-safe fallback. */
export function getGroupChatMemberDisplayName(name: string | null | undefined, membershipStatus: string, memberKind: string | null | undefined): string {
  if (name?.trim()) return name.trim();
  const normalizedStatus = membershipStatus.trim().toLowerCase();
  if (normalizedStatus !== "invited" && normalizedStatus !== "pending") return "Group member";
  const normalizedKind = memberKind?.trim().toLowerCase() ?? "";
  if (normalizedKind === "provider") return "Invited Provider";
  if (normalizedKind === "patient" || normalizedKind === "learner") return "Invited learner";
  return "Invited member";
}

/** Normalizes one received invitation without treating its invitation ID as its group ID. */
export function normalizeGroupChatInvitation(value: unknown): GroupChatInvitation | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id", "invitation_id", "conversation_id");
  const conversationId = readString(value, "conversation_id");
  const group = isRecord(value.group) ? value.group : {};
  const groupId = readString(value, "group_id") || readString(group, "id", "group_id") || conversationId;
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
        conversation_id: nestedInvitation.conversation_id ?? source.conversation_id,
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

/** Normalizes one registry entry without exposing a user ID as a fabricated name. */
export function normalizeGroupChatVerifiedProvider(value: unknown): GroupChatVerifiedProvider | null {
  if (!isRecord(value)) return null;
  const userId = readString(value, "user_id", "userId");
  if (!userId) return null;
  return {
    user_id: userId,
    display_name: readString(value, "display_name", "full_name", "name") || null,
    email: readString(value, "email") || null,
    verified_at: readString(value, "verified_at", "created_at") || null,
  };
}

/** Resolves a registry entry to an authorized tenant-member name when available. */
export function resolveGroupChatVerifiedProviderName(provider: GroupChatVerifiedProvider, members?: readonly TenantMember[]): string | null {
  const backendName = provider.display_name?.trim();
  if (backendName) return backendName;
  return members?.find((member) => member.userId === provider.user_id)?.fullName?.trim() || null;
}

const GENERIC_GROUP_CHAT_NAME_PLACEHOLDERS = new Set(["group member", "invited member", "invited provider", "invited learner", "provider name unavailable", "name unavailable"]);

/** Resolves the canonical owner name without allowing generic parser placeholders to mask a real name. */
export function resolveGroupChatOwnerName(ownerName: string | null | undefined, ownerMemberName: string | null | undefined): string | null {
  const normalizedOwnerName = ownerName?.trim();
  if (normalizedOwnerName && !GENERIC_GROUP_CHAT_NAME_PLACEHOLDERS.has(normalizedOwnerName.toLowerCase())) return normalizedOwnerName;
  const normalizedMemberName = ownerMemberName?.trim();
  if (normalizedMemberName && !GENERIC_GROUP_CHAT_NAME_PLACEHOLDERS.has(normalizedMemberName.toLowerCase())) return normalizedMemberName;
  return null;
}

/** Normalizes only the documented Group Chat message fields. */
export function normalizeGroupChatMessage(value: unknown): GroupChatMessage | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id");
  const conversationId = readString(value, "conversation_id");
  const senderId = readString(value, "sender_id");
  const senderName = typeof value.sender_name === "string" ? value.sender_name : "";
  const senderKind = readString(value, "sender_kind");
  const messageType = readString(value, "message_type");
  const status = readString(value, "status");
  const createdAt = readString(value, "created_at");
  if (!id || !conversationId || !senderId || !senderName.trim() || !senderKind || !messageType || !status || !createdAt) return null;
  const content = typeof value.content === "string" ? value.content : null;
  const attachmentId = typeof value.attachment_id === "string" && value.attachment_id.trim() ? value.attachment_id.trim() : null;
  const placeholder = typeof value.placeholder === "string" && value.placeholder.trim() ? value.placeholder.trim() : null;
  const replyTo = isRecord(value.reply_to) ? value.reply_to : null;
  const mentions = Array.isArray(value.mentions) ? value.mentions.filter((item): item is string => typeof item === "string") : [];
  const myReactions = Array.isArray(value.my_reactions) ? value.my_reactions.filter((item): item is string => typeof item === "string") : [];
  const readBy = Array.isArray(value.read_by) ? value.read_by.filter((item): item is string => typeof item === "string") : null;
  return {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    sender_name: senderName,
    sender_kind: senderKind,
    message_type: messageType,
    content,
    attachment_id: attachmentId,
    status,
    placeholder,
    reply_to: replyTo,
    mentions,
    mentions_all: value.mentions_all === true,
    mentions_me: value.mentions_me === true,
    is_edited: value.is_edited === true,
    edited_at: typeof value.edited_at === "string" && value.edited_at.trim() ? value.edited_at.trim() : null,
    pinned: value.pinned === true,
    reactions: isRecord(value.reactions) ? value.reactions : {},
    my_reactions: myReactions,
    read_by: readBy,
    created_at: createdAt,
  };
}

/** Normalizes the documented cursor response without inventing message fields. */
export function normalizeGroupChatMessageHistory(value: unknown): GroupChatMessageHistoryResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items) || typeof value.has_more !== "boolean") return null;
  const nextCursor = value.next_cursor === null ? null : readString(value, "next_cursor") || null;
  const firstUnreadMessageId = value.first_unread_message_id === null ? null : readString(value, "first_unread_message_id") || null;
  const unreadCount = typeof value.unread_count === "number" && Number.isFinite(value.unread_count) ? value.unread_count : null;
  const pinnedCount = typeof value.pinned_count === "number" && Number.isFinite(value.pinned_count) ? value.pinned_count : null;
  if (unreadCount === null || pinnedCount === null) return null;
  return {
    items: value.items.map(normalizeGroupChatMessage).filter((item): item is GroupChatMessage => item !== null),
    has_more: value.has_more,
    next_cursor: nextCursor,
    unread_count: unreadCount,
    first_unread_message_id: firstUnreadMessageId,
    pinned_count: pinnedCount,
  };
}

/** Builds the documented text-message body and rejects blank content. */
export function buildGroupChatTextMessagePayload(content: string, replyToId = ""): SendGroupChatMessagePayload | null {
  const normalizedContent = content.trim();
  const normalizedReplyToId = replyToId.trim();
  if (!normalizedContent) return null;
  return {
    content: normalizedContent,
    ...(normalizedReplyToId ? { reply_to_id: normalizedReplyToId } : {}),
  };
}

/** Builds the documented edit body and rejects blank replacement text. */
export function buildEditGroupChatMessagePayload(content: string): EditGroupChatMessagePayload | null {
  const normalizedContent = content.trim();
  return normalizedContent ? { content: normalizedContent } : null;
}

/** Builds the documented moderation body and requires a meaningful reason. */
export function buildHideGroupChatMessagePayload(reason: string): HideGroupChatMessagePayload | null {
  const normalizedReason = reason.trim();
  return normalizedReason ? { reason: normalizedReason } : null;
}

/** Parses the Group Chat API's UTC-naive ISO timestamps without changing explicit offsets. */
export function parseGroupChatMessageTimestamp(value: string): number {
  const timestamp = value.trim();
  const timezoneLessMatch = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/.exec(timestamp);

  // The Group Chat backend emits timezone-less ISO timestamps as UTC. Restrict
  // this interpretation to that exact response shape; timestamps with an
  // explicit offset continue to use the platform's standard ISO parser.
  if (timezoneLessMatch) {
    const milliseconds = (timezoneLessMatch[2] ?? "").slice(0, 3).padEnd(3, "0");
    return Date.parse(`${timezoneLessMatch[1]}.${milliseconds}Z`);
  }

  return Date.parse(timestamp);
}

/** Returns true when the current user may edit this visible text message within the 15-minute convenience window. */
export function canEditGroupChatMessage(message: GroupChatMessage, currentUserId: string | null | undefined, now = Date.now()): boolean {
  if (!currentUserId?.trim() || message.sender_id !== currentUserId.trim()) return false;
  if (message.status.trim().toLowerCase() !== "visible" || message.message_type.trim().toLowerCase() !== "text") return false;
  const createdAt = parseGroupChatMessageTimestamp(message.created_at);
  if (!Number.isFinite(createdAt)) return false;
  const elapsed = now - createdAt;
  return elapsed >= 0 && elapsed <= 15 * 60 * 1000;
}

/** Returns true when the current user may retract this visible text message. */
export function canRetractGroupChatMessage(message: GroupChatMessage, currentUserId: string | null | undefined): boolean {
  return Boolean(currentUserId?.trim()) && message.sender_id === currentUserId?.trim() && message.status.trim().toLowerCase() === "visible" && message.message_type.trim().toLowerCase() === "text";
}

/** Returns true when a visible non-system message may be moderated by an authorized active member. */
export function canHideGroupChatMessage(message: GroupChatMessage, canHideMessages: boolean | null, membershipStatus: string | null): boolean {
  return canHideMessages === true && membershipStatus?.trim().toLowerCase() === "active" && message.status.trim().toLowerCase() === "visible" && message.message_type.trim().toLowerCase() !== "system";
}

/** Normalizes only a complete mutation message; acknowledgements and empty responses require history refresh. */
export function normalizeGroupChatMessageMutationResponse(value: unknown): GroupChatMessage | null {
  return normalizeGroupChatMessage(value);
}

/** Returns the safe display text for visible, system, and removed messages. */
export function getGroupChatMessageDisplayText(message: GroupChatMessage): string {
  const status = message.status.trim().toLowerCase();
  if (status === "retracted" || status === "removed_by_admin") return message.placeholder?.trim() || "This message is no longer available.";
  if (message.content !== null) return message.content;
  return message.placeholder?.trim() || "Message content unavailable.";
}

/** Merges cursor pages from newest-to-oldest while restoring chronological order and removing duplicates. */
export function mergeGroupChatMessagePages(pages: readonly GroupChatMessageHistoryResponse[]): GroupChatMessage[] {
  return Array.from(new Map([...pages].reverse().flatMap((page) => page.items).map((message) => [message.id, message])).values());
}

/** Uses backend group status, posting permission, and explicit member mute state to gate the composer. */
export function canSendGroupChatMessage(groupStatus: string | null, canPost: boolean | null, postingMuted = false): boolean {
  return groupStatus?.trim().toLowerCase() !== "closed" && canPost === true && postingMuted !== true;
}

/** Returns the highest-priority read-only notice for the current Group Chat member. */
export function getGroupChatPostingRestrictionMessage(groupStatus: string | null, canPost: boolean | null, postingMuted: boolean | null): string | null {
  if (groupStatus?.trim().toLowerCase() === "closed") return "This group is closed. It is read-only.";
  if (postingMuted === true) return "You have been muted by the Group Owner.";
  if (canPost !== true) return "You cannot send messages in this group.";
  return null;
}

/** Builds the documented Group Chat message-history query without adding unsupported filters. */
export function buildGroupChatMessageHistoryQuery(limit = 50, cursor = ""): URLSearchParams {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (cursor.trim()) query.set("cursor", cursor.trim());
  return query;
}

/** Builds the exact Provider verification request body without inventing registration details. */
export function buildVerifiedProviderPayload(userId: string, registrationNumber = "", registrationCouncil = ""): RegisterGroupChatVerifiedProviderPayload | null {
  const normalizedUserId = userId.trim();
  const normalizedRegistrationNumber = registrationNumber.trim();
  const normalizedRegistrationCouncil = registrationCouncil.trim();
  if (!normalizedUserId) return null;
  return {
    user_id: normalizedUserId,
    ...(normalizedRegistrationNumber ? { registration_number: normalizedRegistrationNumber } : {}),
    ...(normalizedRegistrationCouncil ? { registration_council: normalizedRegistrationCouncil } : {}),
  };
}

/** Returns active internal users, clinic tenant admins, and tenant owners eligible for explicit Group Chat verification. */
export function isGroupChatProviderDirectoryCandidate(member: Pick<TenantMember, "status" | "role" | "roleSlug" | "tenantRbacRoles">): boolean {
  const roleValues = [member.role, member.roleSlug, ...(member.tenantRbacRoles ?? [])].map((role) => role.trim().toLowerCase());
  return member.status.trim().toLowerCase() === "active" && (
    roleValues.includes("internal_user") ||
    roleValues.includes("tenant_admin") ||
    roleValues.includes("tenant_owner")
  );
}

/** Excludes Providers already present in the separate Group Chat verification registry. */
export function isGroupChatProviderRegistrationCandidate(
  member: Pick<TenantMember, "userId" | "status" | "role" | "roleSlug" | "tenantRbacRoles">,
  verifiedUserIds: ReadonlySet<string>,
): boolean {
  return isGroupChatProviderDirectoryCandidate(member) && !verifiedUserIds.has(member.userId);
}

/** Accepts only the explicit not-verified state returned by the candidate endpoint. */
export function isGroupChatProviderVerificationCandidate(candidate: { verification: string | null }): boolean {
  return candidate.verification?.trim().toLowerCase() === "not_verified";
}

/** Normalizes the candidate endpoint without inventing names, roles, or verification state. */
export function normalizeGroupChatProviderVerificationCandidate(value: unknown): GroupChatProviderVerificationCandidate | null {
  if (!isRecord(value)) return null;
  const userId = readString(value, "user_id");
  if (!userId) return null;
  const roles = Array.isArray(value.roles) ? value.roles.filter((role): role is string => typeof role === "string" && Boolean(role.trim())).map((role) => role.trim()) : [];
  return {
    user_id: userId,
    name: readString(value, "name") || null,
    roles,
    verification: readString(value, "verification") || null,
    registration_number: readString(value, "registration_number") || null,
  };
}

/** Builds the all-roles, paginated query required by the verification candidate endpoint. */
export function buildGroupChatProviderVerificationCandidateQuery(page = 1, pageSize = 50): URLSearchParams {
  const query = new URLSearchParams();
  query.set("all_roles", "true");
  query.set("page", String(page));
  query.set("page_size", String(pageSize));
  return query;
}

/** Normalizes the backend's explicit Group Chat permissions with default-deny semantics. */
export function normalizeGroupChatPermissions(value: unknown): GroupChatPermissions {
  const permissions = isRecord(value) ? value : {};
  const readPermission = (key: keyof GroupChatPermissions): boolean | null => typeof permissions[key] === "boolean" ? permissions[key] as boolean : null;
  return {
    can_post: readPermission("can_post"),
    can_edit_group: readPermission("can_edit_group"),
    can_change_settings: readPermission("can_change_settings"),
    can_invite: readPermission("can_invite"),
    can_view_members: readPermission("can_view_members"),
    can_view_pending_invitations: readPermission("can_view_pending_invitations"),
    can_remove_members: readPermission("can_remove_members"),
    can_make_admin: readPermission("can_make_admin"),
    can_remove_admin: readPermission("can_remove_admin"),
    can_mute_members: readPermission("can_mute_members"),
    can_hide_messages: readPermission("can_hide_messages"),
    can_pin_messages: readPermission("can_pin_messages"),
    can_close: readPermission("can_close"),
    can_reopen: readPermission("can_reopen"),
    can_transfer_ownership: readPermission("can_transfer_ownership"),
    can_reassign_owner: readPermission("can_reassign_owner"),
    can_leave: readPermission("can_leave"),
    can_view_audit: readPermission("can_view_audit"),
    can_set_legal_hold: readPermission("can_set_legal_hold"),
    can_report: readPermission("can_report"),
    can_mute_group: readPermission("can_mute_group"),
  };
}

/** Returns whether the backend authorizes closing an open Group Chat. */
export function canCloseGroupChat(input: { status: string | null; permissions: Pick<GroupChatPermissions, "can_close"> }): boolean {
  return input.status?.trim().toLowerCase() !== "closed" && input.permissions.can_close === true;
}

/** Returns whether the backend authorizes editing open Group Chat details. */
export function canEditGroupChat(input: { status: string | null; permissions: Pick<GroupChatPermissions, "can_edit_group"> }): boolean {
  return input.status?.trim().toLowerCase() !== "closed" && input.permissions.can_edit_group === true;
}

/** Returns whether the backend authorizes changing open Group Chat settings. */
export function canUpdateGroupChatSettings(input: { status: string | null; permissions: Pick<GroupChatPermissions, "can_change_settings"> }): boolean {
  return input.status?.trim().toLowerCase() !== "closed" && input.permissions.can_change_settings === true;
}

/** Returns whether the backend authorizes reopening a closed Group Chat. */
export function canReopenGroupChat(input: { status: string | null; permissions: Pick<GroupChatPermissions, "can_reopen"> }): boolean {
  return input.status?.trim().toLowerCase() === "closed" && input.permissions.can_reopen === true;
}

/** Returns a user-facing validation message for a Group Chat reopen reason. */
export function getGroupChatReopenReasonError(reason: string): string | null {
  const trimmedReason = reason.trim();
  if (!trimmedReason) return "A reason is required to reopen this group.";
  if (trimmedReason.length < 3) return "The reopen reason must be at least 3 characters.";
  if (trimmedReason.length > 255) return "The reopen reason must be 255 characters or fewer.";
  return null;
}

/** Builds the validated reopen request body without sending a state-changing request. */
export function buildReopenGroupPayload(reason: string): ReopenGroupPayload | null {
  if (getGroupChatReopenReasonError(reason)) return null;
  return { reason: reason.trim() };
}

/** Builds the minimal PATCH payload for editable Group Chat details. */
export function buildUpdateGroupDetailsPayload(name: string, description: string, avatarUrl?: string): UpdateGroupDetailsPayload {
  const normalizedAvatarUrl = avatarUrl?.trim();
  return { name: name.trim(), description: description.trim(), ...(normalizedAvatarUrl ? { avatar_url: normalizedAvatarUrl } : {}) };
}

/** Builds the minimal PATCH payload for Group Chat posting permissions. */
export function buildUpdateGroupSettingsPayload(adminsOnlyPosting: boolean): UpdateGroupSettingsPayload {
  return { admins_only_posting: adminsOnlyPosting };
}

/** Builds the server-owned Training Group creation payload from selected user IDs. */
export function buildCreateGroupPayload(input: { name: string; contextId: string; description: string; userIds: readonly string[]; adminsOnlyPosting: boolean; avatarUrl?: string }): CreateGroupPayload {
  const userIds = [...new Set(input.userIds.map((id) => id.trim()).filter(Boolean))];
  const normalizedAvatarUrl = input.avatarUrl?.trim();
  return {
    name: input.name.trim(),
    kind: "program",
    context_type: "training",
    context_id: input.contextId,
    description: input.description.trim(),
    invitees: userIds.map((user_id) => ({ user_id })),
    admins_only_posting: input.adminsOnlyPosting,
    ...(normalizedAvatarUrl ? { avatar_url: normalizedAvatarUrl } : {}),
  };
}

/** Accepts image files without inventing backend size restrictions. */
export function isSupportedGroupAvatarFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/** Builds the documented multipart fields for a Group Chat avatar upload. */
export function buildGroupAvatarUploadFormData(file: File): FormData {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "group-avatars");
  return formData;
}

/** Prefers a local preview while retaining an existing avatar when no replacement is selected. */
export type GroupChatAvatarUrlConfig = {
  chatApiBaseUrl: string;
  gatewayMode?: boolean;
};

/** Resolves trusted backend avatar paths without exposing credentials in image URLs. */
export function resolveGroupChatAvatarUrl(
  value: string | null | undefined,
  config?: GroupChatAvatarUrlConfig,
): string | null {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return null;

  if (trimmedValue.startsWith("blob:")) {
    return trimmedValue;
  }

  try {
    const absoluteUrl = new URL(trimmedValue);
    return absoluteUrl.protocol === "https:" ? trimmedValue : null;
  } catch {
    // Backend-relative upload paths are resolved below; unsupported relative values are rejected.
  }

  if (!trimmedValue.startsWith("/api/v1/uploads/")) return null;

  if (!config) return null;
  const configuredBase = config.chatApiBaseUrl.trim();
  if (!configuredBase) return null;

  if (config.gatewayMode ?? configuredBase.startsWith("/")) {
    const gatewayBase = configuredBase.replace(/\/+$/, "");
    return `${gatewayBase}${trimmedValue.slice("/api/v1".length)}`;
  }

  try {
    const configuredUrl = new URL(configuredBase);
    if (!["http:", "https:"].includes(configuredUrl.protocol)) return null;
    return `${configuredUrl.origin}${trimmedValue}`;
  } catch {
    return null;
  }
}

export function resolveGroupAvatarDisplayUrl(
  previewUrl?: string | null,
  currentUrl?: string | null,
): string | null {
  return previewUrl?.trim() || currentUrl?.trim() || null;
}

/** Normalizes the documented uploaded avatar URL, including the standard data envelope. */
export function normalizeGroupAvatarUploadResponse(value: unknown): GroupAvatarUploadResponse | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.data) ? value.data : value;
  const url = source.url;
  return typeof url === "string" && url.trim() ? { url: url.trim() } : null;
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
