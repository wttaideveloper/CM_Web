import type { TrainingListItem } from "@ihp/enterprise-trainings";
import type { TenantMember } from "@ihp/enterprise-runtime";
import type { ChangeGroupMemberRolePayload, CreateGroupPayload, EditGroupChatMessagePayload, GroupAvatarUploadResponse, GroupChatAttachment, GroupChatAttachmentDisplayMetadata, GroupChatAttachmentType, GroupChatConsentListResponse, GroupChatConsentNotice, GroupChatConsentRecord, GroupChatConsentWithdrawalResponse, GroupChatLeaveResponse, GroupChatInvitation, GroupChatInvitationDetails, GroupChatInvitationResult, GroupChatInvitee, GroupChatLearner as ApiGroupChatLearner, GroupChatMember, GroupChatMemberPostingMutePayload, GroupChatMemberRole, GroupChatMessage, GroupChatMessageAttachment, GroupChatMessageHistoryResponse, GroupChatMessageReadStatus, GroupChatPermissions, GroupChatProvider as ApiGroupChatProvider, GroupChatProviderVerificationCandidate, GroupChatReactionPayload, GroupChatReactionSettings, GroupChatReplyReference, GroupChatSharedFile, GroupChatSharedFilesResponse, GroupChatSummary, GroupChatVerifiedProvider, HideGroupChatMessagePayload, InviteMembersPayload, RegisterGroupChatVerifiedProviderPayload, ReopenGroupPayload, SendGroupChatAttachmentMessagePayload, SendGroupChatMessagePayload, TransferGroupOwnershipPayload, UpdateGroupDetailsPayload, UpdateGroupPreferencesPayload, UpdateGroupSettingsPayload } from "./group-chat/group-chat.types";

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

/** Normalizes the backend-authoritative reaction configuration without supplying local defaults. */
export function normalizeGroupChatReactionSettings(value: unknown): GroupChatReactionSettings | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.data) ? value.data : value;
  if (typeof source.enabled !== "boolean" || !Array.isArray(source.emojis)) return null;
  const emojis = Array.from(new Set(source.emojis
    .filter((emoji): emoji is string => typeof emoji === "string")
    .map((emoji) => emoji.trim())
    .filter((emoji) => emoji.length > 0 && emoji.length <= 16)));
  return { enabled: source.enabled, emojis };
}

/** Keeps only finite, non-negative backend reaction counts for safe rendering. */
export function normalizeGroupChatReactionCounts(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<Record<string, number>>((counts, [emoji, count]) => {
    if (emoji.trim() && typeof count === "number" && Number.isFinite(count) && count >= 0) counts[emoji] = Math.floor(count);
    return counts;
  }, {});
}

/** Builds the exact reaction mutation body and enforces the documented emoji length. */
export function buildGroupChatReactionPayload(emoji: string): GroupChatReactionPayload | null {
  const normalizedEmoji = emoji.trim();
  return normalizedEmoji.length > 0 && normalizedEmoji.length <= 16 ? { emoji: normalizedEmoji } : null;
}

/** Builds the encoded emoji query used by reaction removal. */
export function buildGroupChatReactionQuery(emoji: string): URLSearchParams | null {
  const payload = buildGroupChatReactionPayload(emoji);
  if (!payload) return null;
  const query = new URLSearchParams();
  query.set("emoji", payload.emoji);
  return query;
}

/** Reaction controls are available only for visible, non-system messages. */
export function canReactToGroupChatMessage(message: Pick<GroupChatMessage, "message_type" | "status">): boolean {
  return message.status.trim().toLowerCase() === "visible" && message.message_type.trim().toLowerCase() !== "system";
}

/** Uses the backend-provided current-user reaction list for toggle state. */
export function isGroupChatReactionSelected(message: Pick<GroupChatMessage, "my_reactions">, emoji: string): boolean {
  return message.my_reactions.includes(emoji);
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
  const attachment = normalizeGroupChatMessageAttachment(value.attachment);
  const placeholder = typeof value.placeholder === "string" && value.placeholder.trim() ? value.placeholder.trim() : null;
  const replyTo = normalizeGroupChatReplyReference(value.reply_to);
  const mentions = Array.isArray(value.mentions) ? value.mentions.filter((item): item is string => typeof item === "string") : [];
  const myReactions = Array.from(new Set(Array.isArray(value.my_reactions) ? value.my_reactions.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter((item) => item.length > 0 && item.length <= 16) : []));
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
    file_name: readString(value, "file_name"),
    filename: readString(value, "filename"),
    download_url: readString(value, "download_url"),
    file_size: typeof value.file_size === "number" && Number.isFinite(value.file_size) ? value.file_size : null,
    mime_type: readString(value, "mime_type"),
    attachment,
    status,
    placeholder,
    reply_to: replyTo,
    mentions,
    mentions_all: value.mentions_all === true,
    mentions_me: value.mentions_me === true,
    is_edited: value.is_edited === true,
    edited_at: typeof value.edited_at === "string" && value.edited_at.trim() ? value.edited_at.trim() : null,
    pinned: value.pinned === true,
    reactions: normalizeGroupChatReactionCounts(value.reactions),
    my_reactions: myReactions,
    read_by: readBy,
    created_at: createdAt,
  };
}

function normalizeGroupChatMessageAttachment(value: unknown): GroupChatMessageAttachment | null {
  if (!isRecord(value)) return null;
  const attachmentId = readString(value, "attachment_id");
  const id = readString(value, "id");
  const fileName = readString(value, "file_name");
  const filename = readString(value, "filename");
  const attachmentType = readString(value, "attachment_type");
  const downloadUrl = readString(value, "download_url");
  const fileSize = typeof value.file_size === "number" && Number.isFinite(value.file_size) ? value.file_size : null;
  const mimeType = readString(value, "mime_type");
  if (!attachmentId && !id && !fileName && !filename && !attachmentType && !downloadUrl && fileSize === null && !mimeType) return null;
  return { id, attachment_id: attachmentId, file_name: fileName, filename, attachment_type: attachmentType, download_url: downloadUrl, file_size: fileSize, mime_type: mimeType };
}

/** Normalizes backend reply references without exposing hidden original content. */
export function normalizeGroupChatReplyReference(value: unknown): GroupChatReplyReference | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id");
  if (!id) return null;
  const isHidden = value.is_hidden === true;
  return {
    id,
    sender_name: readString(value, "sender_name") || "Group member",
    preview: isHidden ? "Original message unavailable." : readString(value, "preview") || "Original message unavailable.",
    is_hidden: isHidden,
  };
}

function isGroupChatAttachmentType(value: string | null): value is GroupChatAttachmentType {
  return value === "image" || value === "document" || value === "audio" || value === "video";
}

/** Normalizes the existing Chat attachment upload response without accepting undocumented fields. */
export function normalizeGroupChatAttachmentUploadResponse(value: unknown, fallbackType: GroupChatAttachmentType, fallbackFileName: string): GroupChatAttachment | null {
  const candidates = [value, isRecord(value) ? value.data : null, isRecord(value) ? value.item : null].filter(isRecord);
  for (const candidate of candidates) {
    const id = readString(candidate, "id") || readString(candidate, "attachment_id");
    if (!id) continue;
    const fileName = readString(candidate, "file_name") || readString(candidate, "filename") || fallbackFileName.trim();
    const responseType = readString(candidate, "attachment_type");
    const attachmentType = isGroupChatAttachmentType(responseType) ? responseType : fallbackType;
    return {
      id,
      file_name: fileName || fallbackFileName,
      attachment_type: attachmentType,
      download_url: readString(candidate, "download_url"),
      file_size: typeof candidate.file_size === "number" && Number.isFinite(candidate.file_size) ? candidate.file_size : null,
      mime_type: readString(candidate, "mime_type"),
    };
  }
  return null;
}

/** Builds the existing Chat attachment multipart fields for a Group conversation. */
export function buildGroupChatAttachmentUploadFormData(groupId: string, file: File, attachmentType: GroupChatAttachmentType): FormData | null {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId || !file || !isGroupChatAttachmentType(attachmentType)) return null;
  const formData = new FormData();
  formData.append("conversation_id", normalizedGroupId);
  formData.append("file", file);
  formData.append("attachment_type", attachmentType);
  return formData;
}

/** Builds the documented Group Chat attachment message body. */
export function buildGroupChatAttachmentMessagePayload(attachmentType: GroupChatAttachmentType, attachmentId: string): SendGroupChatAttachmentMessagePayload | null {
  const normalizedAttachmentId = attachmentId.trim();
  if (!normalizedAttachmentId || !isGroupChatAttachmentType(attachmentType)) return null;
  return { message_type: attachmentType, attachment_id: normalizedAttachmentId };
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

/** Normalizes the pinned-message list using the same privacy and pagination contract as history. */
export function normalizeGroupChatPinnedMessageHistory(value: unknown): GroupChatMessageHistoryResponse | null {
  return normalizeGroupChatMessageHistory(value);
}

/** Builds the confirmed Group Chat search query and rejects unsupported input lengths. */
export function buildGroupChatSearchQuery(queryText: string, limit = 50): URLSearchParams | null {
  const query = queryText.trim();
  if (query.length < 2 || !Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));
  return params;
}

/** Builds the Shared Files request query without assuming its response shape. */
export function buildGroupChatFilesQuery(limit = 100): URLSearchParams | null {
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return null;
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return params;
}

/** Normalizes the confirmed Shared Files envelope and rejects malformed records. */
export function normalizeGroupChatSharedFilesResponse(value: unknown): GroupChatSharedFilesResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items.map((item) => {
    if (!isRecord(item)) return null;
    const attachmentId = readString(item, "attachment_id");
    const messageId = readString(item, "message_id");
    const senderId = readString(item, "sender_id");
    const fileName = readString(item, "file_name");
    const mimeType = readString(item, "mime_type");
    const attachmentType = readString(item, "attachment_type");
    const createdAt = readString(item, "created_at");
    const fileSize = typeof item.file_size === "number" && Number.isFinite(item.file_size) && item.file_size >= 0 ? item.file_size : null;
    if (!attachmentId || !messageId || !senderId || !fileName || !mimeType || !createdAt || !isGroupChatAttachmentType(attachmentType) || fileSize === null) return null;
    return { attachment_id: attachmentId, message_id: messageId, sender_id: senderId, file_name: fileName, mime_type: mimeType, file_size: fileSize, attachment_type: attachmentType, created_at: createdAt } satisfies GroupChatSharedFile;
  }).filter((item): item is GroupChatSharedFile => item !== null);
  return { items };
}

/** Formats a confirmed Shared Files byte count for the metadata list. */
export function formatGroupChatSharedFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) return "Size unavailable";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 2 : 0).replace(/\.00$/, "")} KB`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 2 : 1).replace(/\.0$/, "")} MB`;
}

export type GroupChatSearchViewState = "idle" | "loading" | "results" | "empty" | "error";

/** Separates an unsubmitted search from an active request and completed result states. */
export function getGroupChatSearchViewState(queryText: string, submittedQuery: string, isFetching: boolean, isError: boolean, resultCount: number | null): GroupChatSearchViewState {
  const currentQuery = queryText.trim();
  const activeQuery = submittedQuery.trim();
  if (currentQuery.length < 2 || currentQuery !== activeQuery) return "idle";
  if (isFetching) return "loading";
  if (isError) return "error";
  if (resultCount === null) return "idle";
  return resultCount > 0 ? "results" : "empty";
}

/** Produces a privacy-safe search/pinned preview without exposing hidden message content. */
export function getGroupChatSafeMessagePreview(message: GroupChatMessage): string {
  if (message.status.trim().toLowerCase() !== "visible") return "Message unavailable.";
  if (message.attachment_id) {
    const type = message.message_type.trim().toLowerCase();
    const label = type === "image" || type === "document" || type === "audio" || type === "video" ? type : "file";
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} attachment`;
  }
  return getGroupChatMessageDisplayText(message);
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
  if (!currentUserId?.trim() || message.sender_id !== currentUserId.trim() || message.status.trim().toLowerCase() !== "visible") return false;
  const messageType = message.message_type.trim().toLowerCase();
  return messageType === "text" || messageType === "image" || messageType === "document" || messageType === "audio" || messageType === "video";
}

/** Returns true only when a visible non-system message can be selected as a reply target. */
export function canReplyToGroupChatMessage(message: GroupChatMessage, groupStatus: string | null, canPost: boolean | null, postingMuted = false): boolean {
  if (!canSendGroupChatMessage(groupStatus, canPost, postingMuted)) return false;
  const status = message.status.trim().toLowerCase();
  return status === "visible" && message.message_type.trim().toLowerCase() !== "system";
}

/** Allows pin controls only when the backend grants them to a known Provider member. */
export function canPinGroupChatMessage(message: GroupChatMessage, canPinMessages: boolean | null, memberKind: string | null | undefined): boolean {
  if (canPinMessages !== true || memberKind?.trim().toLowerCase() !== "provider") return false;
  return message.status.trim().toLowerCase() === "visible" && message.message_type.trim().toLowerCase() !== "system";
}

/** Normalizes the read-status response without exposing untrusted identifiers as names. */
export function normalizeGroupChatMessageReadStatus(value: unknown): GroupChatMessageReadStatus | null {
  if (!isRecord(value) || !Array.isArray(value.seen_by)) return null;
  const messageId = readString(value, "message_id");
  const label = readString(value, "label");
  const seenByCount = typeof value.seen_by_count === "number" && Number.isFinite(value.seen_by_count) && value.seen_by_count >= 0 ? value.seen_by_count : null;
  const recipientCount = typeof value.recipient_count === "number" && Number.isFinite(value.recipient_count) && value.recipient_count >= 0 ? value.recipient_count : null;
  if (!messageId || !label || seenByCount === null || recipientCount === null) return null;
  return {
    message_id: messageId,
    seen_by_count: seenByCount,
    recipient_count: recipientCount,
    label,
    seen_by: Array.from(new Set(value.seen_by.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))),
  };
}

/** Builds the bodyless read-status path for one Group Chat message. */
export function buildGroupChatMessageReadStatusPath(groupId: string, messageId: string): string | null {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  if (!normalizedGroupId || !normalizedMessageId) return null;
  return `/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}/read-status`;
}

/** Allows read-status actions only for active members covered by the Group kind contract. */
export function canViewGroupChatReadStatus(
  message: Pick<GroupChatMessage, "message_type" | "status">,
  groupKind: string | null,
  memberKind: string | null,
  membershipStatus: string | null,
): boolean {
  if (message.status.trim().toLowerCase() !== "visible" || message.message_type.trim().toLowerCase() === "system") return false;
  if (membershipStatus?.trim().toLowerCase() !== "active") return false;
  const normalizedGroupKind = groupKind?.trim().toLowerCase();
  const normalizedMemberKind = memberKind?.trim().toLowerCase();
  if (!["provider", "learner", "patient"].includes(normalizedMemberKind ?? "")) return false;
  if (normalizedGroupKind === "program") return normalizedMemberKind === "provider";
  return normalizedGroupKind === "care";
}

/** Allows the compact read-status indicator only on the current user's outgoing messages. */
export function canShowGroupChatReadStatusIndicator(
  message: GroupChatMessage,
  currentUserId: string | null | undefined,
  groupKind: string | null,
  memberKind: string | null,
  membershipStatus: string | null,
): boolean {
  return Boolean(currentUserId?.trim()) && message.sender_id === currentUserId!.trim() && canViewGroupChatReadStatus(message, groupKind, memberKind, membershipStatus);
}

/** Derives neutral or confirmed read ticks only from fetched backend read-status counts. */
export function getGroupChatReadStatusTickState(readStatus: Pick<GroupChatMessageReadStatus, "seen_by_count" | "recipient_count"> | null | undefined): "single" | "double-neutral" | "double-blue" {
  if (!readStatus || readStatus.recipient_count <= 0 || readStatus.seen_by_count <= 0) return "single";
  if (readStatus.seen_by_count < readStatus.recipient_count) return "double-neutral";
  return "double-blue";
}

/** Resolves seen-by IDs only through the authorized Group member directory. */
export function getGroupChatReadStatusMemberNames(
  readStatus: GroupChatMessageReadStatus,
  members: readonly Pick<GroupChatMember, "user_id" | "name">[],
): string[] {
  const namesByUserId = new Map(
    members
      .filter((member) => Boolean(member.user_id?.trim()) && Boolean(member.name?.trim()))
      .map((member) => [member.user_id!.trim(), member.name.trim()]),
  );
  return readStatus.seen_by.map((userId) => namesByUserId.get(userId) ?? "Group member");
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

/** Creates a safe local reply preview for a loaded message. */
export function getGroupChatReplyPreview(message: GroupChatMessage): string {
  const status = message.status.trim().toLowerCase();
  if (status === "retracted" || status === "removed_by_admin") return "Original message unavailable.";
  const messageType = message.attachment?.attachment_type?.trim().toLowerCase() || message.message_type.trim().toLowerCase();
  if (messageType === "image") return "Image";
  if (messageType === "document") return "Document";
  if (messageType === "audio") return "Audio";
  if (messageType === "video") return "Video";
  return message.content?.trim() || "Original message unavailable.";
}

/** Resolves a reply reference using backend privacy state and, when loaded, the current original message type. */
export function getGroupChatReplyReferencePreview(replyTo: GroupChatReplyReference, loadedTarget?: GroupChatMessage | null): string {
  if (replyTo.is_hidden) return "Original message unavailable.";
  if (loadedTarget) {
    if (loadedTarget.status.trim().toLowerCase() !== "visible") return "Original message unavailable.";
    const messageType = loadedTarget.attachment?.attachment_type?.trim().toLowerCase() || loadedTarget.message_type.trim().toLowerCase();
    if (messageType === "image" || messageType === "document" || messageType === "audio" || messageType === "video") return getGroupChatReplyPreview(loadedTarget);
  }
  return replyTo.preview.trim() || "Original message unavailable.";
}

/** Resolves persisted attachment metadata without treating an attachment ID as a public URL or name. */
export function resolveGroupChatAttachmentMetadata(
  message: GroupChatMessage,
  retrieved?: { fileName: string | null; mimeType: string | null; fileSize: number | null },
): GroupChatAttachmentDisplayMetadata {
  return {
    file_name: retrieved?.fileName?.trim() || message.file_name?.trim() || message.filename?.trim() || message.attachment?.file_name?.trim() || message.attachment?.filename?.trim() || "Attachment",
    mime_type: retrieved?.mimeType?.trim() || message.mime_type?.trim() || message.attachment?.mime_type?.trim() || null,
    file_size: retrieved?.fileSize ?? message.file_size ?? message.attachment?.file_size ?? null,
  };
}

/** Formats the authorized attachment response metadata for a compact Group Chat card. */
export function formatGroupChatAttachmentSummary(metadata: GroupChatAttachmentDisplayMetadata): string {
  const mimeType = metadata.mime_type?.toLowerCase() || "";
  const subtype = mimeType.split("/")[1]?.split(";")[0]?.trim();
  let label = "Protected file";
  if (mimeType === "application/pdf") label = "PDF document";
  else if (mimeType.startsWith("image/") && subtype) label = `${subtype.toUpperCase()} image`;
  else if (mimeType.startsWith("audio/") && subtype) label = `${subtype.toUpperCase()} audio`;
  else if (mimeType.startsWith("video/") && subtype) label = `${subtype.toUpperCase()} video`;
  else if (subtype) label = `${subtype.toUpperCase()} file`;

  const size = metadata.file_size;
  if (size === null || !Number.isFinite(size) || size < 0) return label;
  if (size < 1024) return `${label} · ${size} B`;
  if (size < 1024 * 1024) return `${label} · ${(size / 1024).toFixed(size < 10 * 1024 ? 2 : 0).replace(/\.00$/, "")} KB`;
  return `${label} · ${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 2 : 1).replace(/\.0$/, "")} MB`;
}

/** Extracts a safe attachment filename from standard Content-Disposition parameters. */
export function parseGroupChatAttachmentFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const parameterPattern = /(?:^|;)\s*(filename\*|filename)\s*=\s*(?:"([^"]*)"|([^;]*))/gi;
  let fallbackName: string | null = null;
  let extendedName: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = parameterPattern.exec(contentDisposition)) !== null) {
    const parameterName = match[1].toLowerCase();
    const rawValue = (match[2] ?? match[3] ?? "").trim();
    if (parameterName === "filename*") {
      const encodedValue = /^([^']*)'[^']*'(.*)$/.exec(rawValue);
      if (!encodedValue || encodedValue[1].toLowerCase() !== "utf-8") continue;
      try {
        extendedName = normalizeAttachmentFileName(decodeURIComponent(encodedValue[2])) ?? extendedName;
      } catch {
        // Malformed percent-encoding falls back to filename, when supplied.
      }
      continue;
    }
    fallbackName = normalizeAttachmentFileName(rawValue) ?? fallbackName;
  }
  return extendedName || fallbackName;
}

function normalizeAttachmentFileName(value: string): string | null {
  const normalized = value.trim().replace(/^.*[\\/]/, "");
  return normalized && normalized !== "." && normalized !== ".." && !normalized.includes("\0") ? normalized : null;
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

/** Keeps owner explanation separate from the backend-authoritative leave permission. */
export function getGroupChatLeaveAction(input: { myRole: string | null; ownerUserId: string | null; currentUserId: string; canLeave: boolean }): "enabled" | "disabled-owner" | "hidden" {
  if (input.canLeave) return "enabled";
  const isCurrentOwner = input.myRole?.trim().toLowerCase() === "owner" || (Boolean(input.currentUserId) && input.ownerUserId === input.currentUserId);
  return isCurrentOwner ? "disabled-owner" : "hidden";
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

/** Builds a personal preference update without exposing timed muting controls. */
export function buildUpdateGroupPreferencesPayload(muted: boolean | null, pinned: boolean | null): UpdateGroupPreferencesPayload {
  return { muted, pinned };
}

/** Normalizes the personal preference fields returned by GroupResponse. */
export function normalizeGroupChatPreferences(value: unknown): Pick<UpdateGroupPreferencesPayload, "muted" | "pinned"> & { is_archived: boolean | null } {
  if (!isRecord(value)) return { muted: null, pinned: null, is_archived: null };
  return {
    muted: typeof value.muted === "boolean" ? value.muted : null,
    pinned: typeof value.pinned === "boolean" ? value.pinned : null,
    is_archived: typeof value.is_archived === "boolean" ? value.is_archived : null,
  };
}

/** Returns only personal preference indicators that are explicitly enabled. */
export function getGroupChatPersonalPreferenceIndicators(group: Pick<GroupChatSummary, "muted" | "pinned">): Array<"muted" | "pinned"> {
  const indicators: Array<"muted" | "pinned"> = [];
  if (group.pinned === true) indicators.push("pinned");
  if (group.muted === true) indicators.push("muted");
  return indicators;
}

/** Places personally pinned groups first while preserving the backend order within each category. */
export function orderGroupChatSummariesByPersonalPin(groups: readonly GroupChatSummary[]): GroupChatSummary[] {
  return [...groups.filter((group) => group.pinned === true), ...groups.filter((group) => group.pinned !== true)];
}

/** Normalizes one personal consent record without exposing undocumented notice fields. */
export function normalizeGroupChatConsentRecord(value: unknown): GroupChatConsentRecord | null {
  if (!isRecord(value)) return null;
  const conversationId = readString(value, "conversation_id");
  if (!conversationId) return null;
  const notice = isRecord(value.notice) ? value.notice : {};
  return {
    record_id: readString(value, "id", "consent_id", "record_id") || null,
    conversation_id: conversationId,
    group_name: readString(value, "group_name") || null,
    granted_at: readString(value, "granted_at") || null,
    withdrawn_at: readString(value, "withdrawn_at") || null,
    is_minor: typeof value.is_minor === "boolean" ? value.is_minor : null,
    guardian_name: readString(value, "guardian_name") || null,
    guardian_relationship: readString(value, "guardian_relationship") || null,
    notice,
  };
}

/** Projects only the documented display-safe consent notice fields. */
export function normalizeGroupChatConsentNotice(value: unknown): GroupChatConsentNotice {
  if (!isRecord(value)) {
    return { name: null, kind: null, purpose: null, invited_at: null, description: null, member_count: null, provider_names: [], invited_by_name: null, visibility_notice: null, what_members_can_see: null, emergency_notice: null, requires_guardian_consent: null };
  }
  const emergency = isRecord(value.emergency_notice) ? value.emergency_notice : null;
  const providerNames = Array.isArray(value.provider_names) ? value.provider_names.filter((name): name is string => typeof name === "string" && Boolean(name.trim())).map((name) => name.trim()) : [];
  const memberCount = typeof value.member_count === "number" && Number.isFinite(value.member_count) && value.member_count >= 0 ? value.member_count : null;
  return {
    name: readString(value, "name") || null,
    kind: readString(value, "kind") || null,
    purpose: readString(value, "purpose") || null,
    invited_at: readString(value, "invited_at") || null,
    description: readString(value, "description") || null,
    member_count: memberCount,
    provider_names: providerNames,
    invited_by_name: readString(value, "invited_by_name") || null,
    visibility_notice: readString(value, "visibility_notice") || null,
    what_members_can_see: readString(value, "what_members_can_see") || null,
    emergency_notice: emergency ? { text: readString(emergency, "text") || null, number: readString(emergency, "number") || null } : null,
    requires_guardian_consent: typeof value.requires_guardian_consent === "boolean" ? value.requires_guardian_consent : null,
  };
}

/** Normalizes the authenticated user's personal consent-history response. */
export function normalizeGroupChatConsentList(value: unknown): GroupChatConsentListResponse {
  const source = isRecord(value) && Array.isArray(value.items) ? value.items : [];
  return { items: source.map(normalizeGroupChatConsentRecord).filter((item): item is GroupChatConsentRecord => item !== null) };
}

/** Provides stable keys without collapsing historical records for one conversation. */
export function getGroupChatConsentRecordKey(record: GroupChatConsentRecord, index: number): string {
  return record.record_id?.trim() || `${record.conversation_id}:${record.granted_at || "unknown"}:${record.withdrawn_at || "active"}:${index}`;
}

/** Labels consent history without inferring current Group membership. */
export function getGroupChatConsentStatusLabel(record: GroupChatConsentRecord): "Withdrawn" | "Consent recorded" {
  return record.withdrawn_at ? "Withdrawn" : "Consent recorded";
}

/** Keeps the backend emergency wording intact and avoids repeating an included number. */
export function getGroupChatEmergencyNoticeDisplay(notice: GroupChatConsentNotice): { text: string | null; number: string | null } {
  const text = notice.emergency_notice?.text?.trim() || null;
  const number = notice.emergency_notice?.number?.trim() || null;
  if (!text || !number) return { text, number };
  const numberDigits = number.replace(/\D/g, "");
  if (!numberDigits) return { text, number };
  const numberTokens = text.match(/\+?\d(?:[\d\s().-]*\d)?/g) ?? [];
  const alreadyIncluded = numberTokens.some((token) => token.replace(/\D/g, "") === numberDigits);
  return { text, number: alreadyIncluded ? null : number };
}

/** Accepts only the documented string or the observed, group-matching withdrawal response. */
export function normalizeGroupChatConsentWithdrawalResponse(value: unknown, expectedGroupId: string): string | GroupChatConsentWithdrawalResponse | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!isRecord(value)) return null;
  const conversationId = readString(value, "conversation_id");
  const status = readString(value, "status");
  if (!conversationId || conversationId !== expectedGroupId.trim() || status !== "withdrawn") return null;
  return { conversation_id: conversationId, status: "withdrawn" };
}

/** Accepts only the documented string or the observed, group-matching leave response. */
export function normalizeGroupChatLeaveResponse(value: unknown, expectedGroupId: string): string | GroupChatLeaveResponse | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!isRecord(value)) return null;
  const conversationId = readString(value, "conversation_id");
  const status = readString(value, "status");
  if (!conversationId || conversationId !== expectedGroupId.trim() || status !== "left") return null;
  return { conversation_id: conversationId, status: "left" };
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
