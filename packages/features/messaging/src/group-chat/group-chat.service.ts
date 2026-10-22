import { chatRequestResponse } from "@ihp/chat-runtime";

import type {
  AcceptGroupInvitationPayload,
  ChangeGroupMemberRolePayload,
  CreateGroupPayload,
  EditGroupChatMessagePayload,
  GroupChatDetails,
  GroupChatAttachment,
  GroupChatAttachmentDownloadResponse,
  GroupChatAttachmentType,
  GroupAvatarUploadResponse,
  GroupChatInvitation,
  GroupChatInvitationDetails,
  GroupChatInvitationListParams,
  GroupChatInvitationListResponse,
  GroupChatInvitationResult,
  GroupChatFilesListParams,
  GroupChatLearner,
  GroupChatLearnerListParams,
  GroupChatLearnerListResponse,
  GroupChatListParams,
  GroupChatListResponse,
  GroupChatMember,
  GroupChatMemberPostingMutePayload,
  GroupChatMemberRole,
  GroupChatMessage,
  GroupChatMessageHistoryResponse,
  GroupChatMessageReadStatus,
  GroupChatMessageListParams,
  GroupChatMemberListParams,
  GroupChatMemberListResponse,
  GroupChatPagination,
  GroupChatReactionSettings,
  GroupChatProvider,
  GroupChatProviderListParams,
  GroupChatProviderListResponse,
  GroupChatProviderVerificationCandidateListParams,
  GroupChatProviderVerificationCandidateListResponse,
  GroupChatSearchParams,
  GroupChatSharedFilesResponse,
  GroupChatSummary,
  GroupChatTraining,
  GroupChatTrainingListParams,
  GroupChatTrainingListResponse,
  GroupChatInvitee,
  GroupChatVerifiedProvider,
  HideGroupChatMessagePayload,
  GroupChatVerifiedProviderListParams,
  GroupChatVerifiedProviderListResponse,
  RegisterGroupChatVerifiedProviderPayload,
  ReopenGroupPayload,
  TransferGroupOwnershipPayload,
  InviteMembersPayload,
  InviteEnrolledLearnersPayload,
  UpdateGroupDetailsPayload,
  UpdateGroupPreferencesPayload,
  UpdateGroupSettingsPayload,
} from "./group-chat.types";
import { buildChangeGroupMemberRolePayload, buildEditGroupChatMessagePayload, buildGroupAvatarUploadFormData, buildGroupChatAttachmentMessagePayload, buildGroupChatAttachmentUploadFormData, buildGroupChatMemberMutePayload, buildGroupChatMessageHistoryQuery, buildGroupChatFilesQuery, buildGroupChatMessageReadStatusPath, buildGroupChatProviderVerificationCandidateQuery, buildGroupChatReactionPayload, buildGroupChatReactionQuery, buildGroupChatSearchQuery, buildGroupChatTextMessagePayload, buildGroupMemberInvitePayload, buildGroupMemberRemovalQuery, buildHideGroupChatMessagePayload, buildReopenGroupPayload, buildTransferGroupOwnershipPayload, buildUpdateGroupDetailsPayload, buildUpdateGroupPreferencesPayload, buildUpdateGroupSettingsPayload, buildVerifiedProviderPayload, getGroupChatMemberDisplayName, isSupportedGroupAvatarFile, normalizeGroupAvatarUploadResponse, normalizeGroupChatAttachmentUploadResponse, normalizeGroupChatInvitation, normalizeGroupChatInvitationDetails, normalizeGroupChatMemberEligibility, normalizeGroupChatMemberPostingMute, normalizeGroupChatMessage, normalizeGroupChatMessageHistory, normalizeGroupChatMessageReadStatus, normalizeGroupChatPinnedMessageHistory, normalizeGroupChatPermissions, normalizeGroupChatPreferences, normalizeGroupChatProviderVerificationCandidate, normalizeGroupChatReactionSettings, getGroupChatReopenReasonError, normalizeGroupChatMessageMutationResponse, normalizeGroupChatSharedFilesResponse, parseGroupChatAttachmentFileName, resolveGroupChatOwnerName } from "../group-chat-models";
export { buildCreateGroupPayload, buildGroupMemberInvitePayload } from "../group-chat-models";

const GROUP_CHAT_API_PATH = "/groups";
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_MAX_MEMBERS = 50;

/** Safe, status-aware error exposed by the Group Chat API client. */
export class GroupChatApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GroupChatApiError";
    this.status = status;
  }
}

/** Uploads one validated Group Chat avatar through the authenticated upload endpoint. */
export async function uploadGroupAvatar(file: File): Promise<string> {
  if (!isSupportedGroupAvatarFile(file)) throw new GroupChatApiError(422, "Select an image file for the Group Chat avatar.");
  try {
    const response = await chatRequestResponse("/uploads/", { method: "POST", body: buildGroupAvatarUploadFormData(file) }, false);
    if (!response.ok) throw new GroupChatApiError(response.status, await backendErrorMessage(response));
    const body: unknown = await response.json();
    const parsed: GroupAvatarUploadResponse | null = normalizeGroupAvatarUploadResponse(body);
    if (!parsed) throw new GroupChatApiError(502, "The upload service did not return an avatar URL.");
    return parsed.url;
  } catch (error: unknown) {
    if (error instanceof GroupChatApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new GroupChatApiError(0, "Unable to upload the Group Chat avatar.");
  }
}

/** Uploads a Group Chat attachment through the existing authenticated Chat attachment endpoint. */
export async function uploadGroupChatAttachment(groupId: string, file: File, attachmentType: GroupChatAttachmentType): Promise<GroupChatAttachment> {
  const normalizedGroupId = groupId.trim();
  const formData = buildGroupChatAttachmentUploadFormData(normalizedGroupId, file, attachmentType);
  if (!formData) throw new GroupChatApiError(422, "A Group Chat and attachment are required.");

  try {
    const response = await chatRequestResponse("/attachments/upload", { method: "POST", body: formData }, false);
    if (!response.ok) throw new GroupChatApiError(response.status, await backendErrorMessage(response));
    const parsed = normalizeGroupChatAttachmentUploadResponse(await response.json(), attachmentType, file.name);
    if (!parsed) throw new GroupChatApiError(502, "The attachment service did not return an attachment ID.");
    return parsed;
  } catch (error: unknown) {
    if (error instanceof GroupChatApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new GroupChatApiError(0, "Unable to upload the Group Chat attachment.");
  }
}

/** Downloads a Group Chat attachment through the existing authorized binary endpoint. */
export async function downloadGroupChatAttachment(attachmentId: string): Promise<GroupChatAttachmentDownloadResponse> {
  const normalizedAttachmentId = attachmentId.trim();
  if (!normalizedAttachmentId) throw new GroupChatApiError(422, "An attachment identifier is required.");

  const response = await chatRequestResponse(`/attachments/${encodeURIComponent(normalizedAttachmentId)}?download=true`, { method: "GET" }, false);
  if (!response.ok) throw new GroupChatApiError(response.status, await backendErrorMessage(response));
  const contentType = response.headers.get("content-type");
  if (contentType?.toLowerCase().includes("application/json")) {
    await response.text().catch(() => "");
    throw new GroupChatApiError(502, "The attachment service returned an invalid file response.");
  }
  const blob = await response.blob();
  return {
    blob,
    fileName: parseGroupChatAttachmentFileName(response.headers.get("content-disposition")),
    mimeType: contentType,
    fileSize: blob.size,
  };
}

type RequestOptions = {
  method?: "DELETE" | "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function unwrapData(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  if (isRecord(value.data)) return value.data;
  if (isRecord(value.result)) return value.result;
  return value;
}

function readCollection(value: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.data)) return value.data;
  const source = unwrapData(value);
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key];
  }
  return [];
}

function readPagination(value: unknown, page: number, pageSize: number, totalFallback: number): GroupChatPagination {
  const source = unwrapData(value);
  const pagination = isRecord(source.pagination) ? source.pagination : source;
  const total = readNumber(pagination.total) ?? totalFallback;
  const resolvedPage = readNumber(pagination.page) ?? page;
  const resolvedPageSize = readNumber(pagination.page_size) ?? readNumber(pagination.pageSize) ?? pageSize;
  const totalPages = readNumber(pagination.total_pages) ?? readNumber(pagination.totalPages) ?? Math.max(1, Math.ceil(total / Math.max(1, resolvedPageSize)));
  return { total, page: resolvedPage, page_size: resolvedPageSize, total_pages: totalPages };
}

function safeApiMessage(status: number): string {
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You do not have access to this Group Chat action.";
  if (status === 404) return "The requested Group Chat data was not found.";
  if (status === 409) return "This Group Chat changed or has reached its member capacity.";
  if (status === 422) return "The Group Chat request was invalid.";
  if (status === 429) return "Too many requests. Try again shortly.";
  if (status >= 500) return "Group Chat data is temporarily unavailable.";
  return "Unable to complete the Group Chat request.";
}

async function backendErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return safeApiMessage(response.status);
  try {
    const body: unknown = JSON.parse(text);
    if (isRecord(body)) {
      return readString(body.detail) ?? readString(body.message) ?? readString(body.title) ?? safeApiMessage(response.status);
    }
  } catch {
    // Keep the safe status message when the backend did not return JSON.
  }
  return safeApiMessage(response.status);
}

async function request<T>(path: string, params = new URLSearchParams(), options: RequestOptions = {}): Promise<T> {
  const query = params.toString();
  const url = `${GROUP_CHAT_API_PATH}${path}${query ? `?${query}` : ""}`;
  const init: RequestInit = { method: options.method ?? "GET", headers: options.headers, signal: options.signal };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  try {
    const response = await chatRequestResponse(url, init);
    if (!response.ok) throw new GroupChatApiError(response.status, await backendErrorMessage(response));
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text.trim()) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  } catch (error: unknown) {
    if (error instanceof GroupChatApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw error;
    const status = isRecord(error) && typeof error.status === "number" ? error.status : 0;
    throw new GroupChatApiError(status, status ? safeApiMessage(status) : "Unable to reach the Group Chat service.");
  }
}

function appendCommonParams(params: URLSearchParams, page: number, pageSize: number): void {
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
}

function makeParams(page = 1, pageSize = DEFAULT_PAGE_SIZE): URLSearchParams {
  const params = new URLSearchParams();
  appendCommonParams(params, page, pageSize);
  return params;
}

function parseTraining(value: unknown): GroupChatTraining | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id ?? value.training_id);
  if (!id) return null;
  return {
    id,
    title: readString(value.title ?? value.name) ?? "Untitled Training",
    status: readString(value.status) ?? "",
    delivery_mode: readString(value.delivery_mode),
    instructor_name: readString(value.instructor_name),
    instructor_user_id: readString(value.instructor_user_id),
    instructor_is_verified_provider: readBoolean(value.instructor_is_verified_provider),
    enrolled_count: readNumber(value.enrolled_count),
    group_count: readNumber(value.group_count),
    created_at: readString(value.created_at),
  };
}

function parseTrainingList(value: unknown, page: number, pageSize: number): GroupChatTrainingListResponse {
  const items = readCollection(value, ["items", "trainings"]).map(parseTraining).filter((item): item is GroupChatTraining => item !== null);
  return { items, pagination: readPagination(value, page, pageSize, items.length) };
}

function parseLearner(value: unknown): GroupChatLearner | null {
  if (!isRecord(value)) return null;
  const enrolmentId = readString(value.enrolment_id ?? value.enrollment_id ?? value.id);
  if (!enrolmentId) return null;
  const groupIds = Array.isArray(value.group_ids) ? value.group_ids.filter((id): id is string => typeof id === "string" && Boolean(id.trim())) : [];
  return {
    enrolment_id: enrolmentId,
    name: readString(value.name ?? value.display_name ?? value.full_name) ?? "Enrolled learner",
    email: readString(value.email),
    enrolment_status: readString(value.enrolment_status ?? value.enrollment_status) ?? "",
    user_id: readString(value.user_id),
    can_invite: readBoolean(value.can_invite),
    reason: readString(value.reason),
    group_state: readString(value.group_state),
    group_ids: groupIds,
    enrolled_at: readString(value.enrolled_at),
  };
}

function parseLearnerList(value: unknown, trainingId: string, page: number, pageSize: number): GroupChatLearnerListResponse {
  const source = unwrapData(value);
  const items = readCollection(value, ["items", "learners", "enrolments", "enrollments"]).map(parseLearner).filter((item): item is GroupChatLearner => item !== null);
  const maxMembers = readNumber(source.max_members) ?? DEFAULT_MAX_MEMBERS;
  return {
    training_id: readString(source.training_id) ?? trainingId,
    training_title: readString(source.training_title),
    items,
    pagination: readPagination(value, page, pageSize, items.length),
    eligible_total: readNumber(source.eligible_total),
    max_members: maxMembers > 0 ? maxMembers : DEFAULT_MAX_MEMBERS,
  };
}

function parseProvider(value: unknown): GroupChatProvider | null {
  if (!isRecord(value)) return null;
  const userId = readString(value.user_id ?? value.id);
  if (!userId) return null;
  return {
    user_id: userId,
    name: readString(value.name ?? value.display_name ?? value.full_name) ?? "Verified Provider",
    registration_number: readString(value.registration_number),
    is_training_instructor: readBoolean(value.is_training_instructor),
    is_me: readBoolean(value.is_me),
  };
}

function parseProviderList(value: unknown, trainingId: string, page: number, pageSize: number): GroupChatProviderListResponse {
  const source = unwrapData(value);
  const items = readCollection(value, ["items", "providers"]).map(parseProvider).filter((item): item is GroupChatProvider => item !== null);
  return {
    training_id: readString(source.training_id) ?? trainingId,
    instructor_name: readString(source.instructor_name),
    items,
    pagination: readPagination(value, page, pageSize, items.length),
  };
}

function parseLastMessage(value: unknown): { text: string | null; at: string | null } {
  if (typeof value === "string") return { text: value, at: null };
  if (!isRecord(value)) return { text: null, at: null };
  return { text: readString(value.text ?? value.content ?? value.body), at: readString(value.created_at ?? value.sent_at) };
}

function parseGroup(value: unknown): GroupChatSummary | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id ?? value.group_id);
  if (!id) return null;
  const lastMessage = parseLastMessage(value.last_message ?? value.latest_message);
  const context = isRecord(value.context) ? value.context : {};
  return {
    id,
    name: readString(value.name ?? value.title) ?? "Untitled group",
    description: readString(value.description),
    kind: readString(value.kind),
    context_type: readString(value.context_type),
    context_id: readString(value.context_id),
    context_name: readString(value.context_name ?? value.training_title ?? context.name ?? context.title),
    status: readString(value.status),
    member_count: readNumber(value.member_count ?? value.members_count),
    max_members: readNumber(value.max_members ?? value.capacity),
    pending_invitation_count: readNumber(value.pending_invitation_count ?? value.pending_count),
    unread_count: readNumber(value.unread_count) ?? 0,
    last_message: lastMessage.text,
    last_message_at: readString(value.last_message_at ?? value.latest_message_at) ?? lastMessage.at,
    owner_name: readString(value.owner_name),
    owner_user_id: readString(value.owner_user_id),
    avatar_url: readString(value.avatar_url),
    admins_only_posting: readNullableBoolean(value.admins_only_posting),
    ...normalizeGroupChatPreferences(value),
    visibility_notice: readString(value.visibility_notice),
    emergency_notice: readString(value.emergency_notice),
    my_role: readString(value.my_role ?? value.current_user_role),
    permissions: normalizeGroupChatPermissions(value.permissions),
  };
}

function parseGroupList(value: unknown, page: number, pageSize: number): GroupChatListResponse {
  const items = readCollection(value, ["items", "groups"]).map(parseGroup).filter((item): item is GroupChatSummary => item !== null);
  return { items, pagination: readPagination(value, page, pageSize, items.length) };
}

function parseMember(value: unknown): GroupChatMember | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id ?? value.member_id ?? value.user_id);
  if (!id) return null;
  const membershipStatus = readString(value.membership_status ?? value.status) ?? "active";
  const memberKind = readString(value.member_kind ?? value.kind);
  return {
    id,
    user_id: readString(value.user_id),
    name: getGroupChatMemberDisplayName(readString(value.name ?? value.display_name ?? value.full_name), membershipStatus, memberKind),
    role: readString(value.role ?? value.group_role) ?? "Member",
    member_kind: memberKind,
    membership_status: membershipStatus,
    joined_at: readString(value.joined_at ?? value.created_at),
    is_current_user: readBoolean(value.is_current_user ?? value.is_me),
    can_manage: readNullableBoolean(value.can_manage),
    ...normalizeGroupChatMemberEligibility(value),
    ...normalizeGroupChatMemberPostingMute(value),
  };
}

function parseMemberList(value: unknown, groupId: string, page: number, pageSize: number): GroupChatMemberListResponse {
  const source = unwrapData(value);
  const items = readCollection(value, ["items", "members"]).map(parseMember).filter((item): item is GroupChatMember => item !== null);
  const pending = readCollection(value, ["pending_invitations", "invitations"]).map(normalizeGroupChatInvitation).filter((item): item is GroupChatInvitation => item !== null);
  return { group_id: readString(source.group_id) ?? groupId, items, pending_invitations: pending, pagination: readPagination(value, page, pageSize, items.length) };
}

function parseInvitationList(value: unknown, page: number, pageSize: number): GroupChatInvitationListResponse {
  const items = readCollection(value, ["items", "invitations"]).map(normalizeGroupChatInvitation).filter((item): item is GroupChatInvitation => item !== null);
  return { items, pagination: readPagination(value, page, pageSize, items.length) };
}

function parseInvitationResult(value: unknown): GroupChatInvitationResult {
  const source = unwrapData(value);
  const invited = Array.isArray(source.invited) ? source.invited.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  const skipped = Array.isArray(source.skipped) ? source.skipped.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  return { invited, skipped };
}

function parseVerifiedProvider(value: unknown): GroupChatVerifiedProvider | null {
  if (!isRecord(value)) return null;
  const userId = readString(value.user_id ?? value.userId);
  if (!userId) return null;
  return {
    user_id: userId,
    display_name: readString(value.display_name ?? value.full_name ?? value.name),
    email: readString(value.email),
    verified_at: readString(value.verified_at ?? value.created_at),
  };
}

function parseVerifiedProviderList(value: unknown, page: number, pageSize: number): GroupChatVerifiedProviderListResponse {
  const items = readCollection(value, ["items", "providers", "verified_providers"])
    .map(parseVerifiedProvider)
    .filter((item): item is GroupChatVerifiedProvider => item !== null);
  return { items, pagination: readPagination(value, page, pageSize, items.length) };
}

function parseProviderVerificationCandidateList(value: unknown, page: number, pageSize: number): GroupChatProviderVerificationCandidateListResponse {
  const items = readCollection(value, ["items", "candidates"])
    .map(normalizeGroupChatProviderVerificationCandidate)
    .filter((item): item is NonNullable<typeof item> => item !== null);
  return { items, pagination: readPagination(value, page, pageSize, items.length) };
}

function parseGroupDetails(value: unknown): GroupChatDetails | null {
  const source = unwrapData(value);
  const nestedGroup = isRecord(source.group) ? source.group : null;
  const group = parseGroup(nestedGroup ? { ...nestedGroup, muted: source.muted ?? nestedGroup.muted, pinned: source.pinned ?? nestedGroup.pinned, is_archived: source.is_archived ?? nestedGroup.is_archived } : source);
  if (!group) return null;
  const owner = parseMember(source.owner);
  const ownerName = resolveGroupChatOwnerName(group.owner_name, owner?.name);
  return { ...group, training_title: readString(source.training_title ?? source.context_name), owner: owner && ownerName ? { ...owner, name: ownerName } : owner };
}

function requireParsed<T>(value: T | null, message: string): T {
  if (!value) throw new GroupChatApiError(0, message);
  return value;
}

/** Loads Trainings visible to the authenticated Group Chat creator. */
export async function listGroupChatTrainings(params: GroupChatTrainingListParams = {}): Promise<GroupChatTrainingListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = makeParams(page, pageSize);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  return parseTrainingList(await request<unknown>("/trainings", query, { signal: params.signal }), page, pageSize);
}

/** Loads enrolled learner candidates for one Training without changing membership. */
export async function listGroupChatLearners(trainingId: string, params: GroupChatLearnerListParams = {}): Promise<GroupChatLearnerListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = makeParams(page, pageSize);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.eligibleOnly !== undefined) query.set("eligible_only", String(params.eligibleOnly));
  if (params.enrolmentStatus?.trim()) query.set("enrolment_status", params.enrolmentStatus.trim());
  if (params.notInGroup !== undefined) query.set("not_in_group", String(params.notInGroup));
  if (params.groupId?.trim()) query.set("group_id", params.groupId.trim());
  return parseLearnerList(await request<unknown>(`/trainings/${encodeURIComponent(trainingId)}/learners`, query, { signal: params.signal }), trainingId, page, pageSize);
}

/** Loads authorized verified Provider candidates for one Training. */
export async function listGroupChatProviders(trainingId: string, params: GroupChatProviderListParams = {}): Promise<GroupChatProviderListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.page !== undefined) appendCommonParams(query, page, pageSize);
  return parseProviderList(await request<unknown>(`/trainings/${encodeURIComponent(trainingId)}/providers`, query, { signal: params.signal }), trainingId, page, pageSize);
}

/** Loads the authenticated user's Group Chat list. */
export async function listGroupChatGroups(params: GroupChatListParams = {}): Promise<GroupChatListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = makeParams(page, pageSize);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  return parseGroupList(await request<unknown>("", query, { signal: params.signal }), page, pageSize);
}

/** Loads one Group Chat's server-provided details. */
export async function getGroupChat(groupId: string, signal?: AbortSignal): Promise<GroupChatDetails> {
  return requireParsed(parseGroupDetails(await request<unknown>(`/${encodeURIComponent(groupId)}`, new URLSearchParams(), { signal })), "The Group Chat details response was invalid.");
}

/** Loads the backend-authorized reaction configuration for one Group Chat. */
export async function getGroupChatReactions(groupId: string, signal?: AbortSignal): Promise<GroupChatReactionSettings> {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) throw new GroupChatApiError(422, "The Group Chat identifier is required.");
  const parsed = normalizeGroupChatReactionSettings(await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/reactions`, new URLSearchParams(), { signal }));
  return requireParsed(parsed, "The Group Chat reaction settings response was invalid.");
}

/** Adds one backend-approved reaction; the generic mutation response is intentionally ignored. */
export async function addGroupChatMessageReaction(groupId: string, messageId: string, emoji: string): Promise<void> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  const payload = buildGroupChatReactionPayload(emoji);
  if (!normalizedGroupId || !normalizedMessageId || !payload) throw new GroupChatApiError(422, "A Group Chat, message, and valid reaction are required.");
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}/reactions`, new URLSearchParams(), { method: "PUT", headers: { "Content-Type": "application/json" }, body: payload });
}

/** Removes one current-user reaction using the documented encoded emoji query parameter. */
export async function removeGroupChatMessageReaction(groupId: string, messageId: string, emoji: string): Promise<void> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  const query = buildGroupChatReactionQuery(emoji);
  if (!normalizedGroupId || !normalizedMessageId || !query) throw new GroupChatApiError(422, "A Group Chat, message, and valid reaction are required.");
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}/reactions`, query, { method: "DELETE" });
}

/** Loads the authorized pinned-message list for one Group Chat. */
export async function listGroupChatPinnedMessages(groupId: string, signal?: AbortSignal): Promise<GroupChatMessageHistoryResponse> {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) throw new GroupChatApiError(422, "The Group Chat identifier is required.");
  const response = normalizeGroupChatPinnedMessageHistory(await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/pinned`, new URLSearchParams(), { signal }));
  return requireParsed(response, "The pinned Group Chat message response was invalid.");
}

/** Pins one Group Chat message; the backend response is normalized when it contains a complete message. */
export async function pinGroupChatMessage(groupId: string, messageId: string): Promise<GroupChatMessage | null> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  if (!normalizedGroupId || !normalizedMessageId) throw new GroupChatApiError(422, "A Group Chat and message are required.");
  const response = await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}/pin`, new URLSearchParams(), { method: "PUT" });
  return normalizeGroupChatMessageMutationResponse(response);
}

/** Unpins one Group Chat message; the backend response is normalized when it contains a complete message. */
export async function unpinGroupChatMessage(groupId: string, messageId: string): Promise<GroupChatMessage | null> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  if (!normalizedGroupId || !normalizedMessageId) throw new GroupChatApiError(422, "A Group Chat and message are required.");
  const response = await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}/pin`, new URLSearchParams(), { method: "DELETE" });
  return normalizeGroupChatMessageMutationResponse(response);
}

/** Searches only the active Group Chat using the backend message-list contract. */
export async function searchGroupChatMessages(groupId: string, queryText: string, params: GroupChatSearchParams = {}): Promise<GroupChatMessageHistoryResponse> {
  const normalizedGroupId = groupId.trim();
  const query = buildGroupChatSearchQuery(queryText, params.limit ?? 50);
  if (!normalizedGroupId || !query) throw new GroupChatApiError(422, "A Group Chat and a search of at least 2 characters are required.");
  const response = normalizeGroupChatMessageHistory(await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/search`, query, { signal: params.signal }));
  return requireParsed(response, "The Group Chat search response was invalid.");
}

/** Loads the confirmed Shared Files response through the authenticated Group Chat client. */
export async function listGroupChatFiles(groupId: string, params: GroupChatFilesListParams = {}): Promise<GroupChatSharedFilesResponse> {
  const normalizedGroupId = groupId.trim();
  const query = buildGroupChatFilesQuery(params.limit ?? 100);
  if (!normalizedGroupId || !query) throw new GroupChatApiError(422, "A Group Chat and valid files limit are required.");
  const response = normalizeGroupChatSharedFilesResponse(await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/files`, query, { signal: params.signal }));
  return requireParsed(response, "The Shared Files response was invalid.");
}

/** Loads oldest-first Group Chat history using the documented cursor contract. */
export async function listGroupChatMessages(groupId: string, params: GroupChatMessageListParams = {}): Promise<GroupChatMessageHistoryResponse> {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) throw new GroupChatApiError(422, "The Group Chat identifier is required.");
  const query = buildGroupChatMessageHistoryQuery(params.limit ?? 50, params.cursor ?? "");
  const response = normalizeGroupChatMessageHistory(await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages`, query, { signal: params.signal }));
  return requireParsed(response, "The Group Chat message history response was invalid.");
}

/** Sends one Group Chat text message through the REST-only message endpoint. */
export async function sendGroupChatTextMessage(groupId: string, content: string, replyToId = ""): Promise<GroupChatMessage> {
  const normalizedGroupId = groupId.trim();
  const payload = buildGroupChatTextMessagePayload(content, replyToId);
  if (!normalizedGroupId || !payload) throw new GroupChatApiError(422, "A Group Chat and non-empty message are required.");
  const response = normalizeGroupChatMessage(await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages`, new URLSearchParams(), { method: "POST", body: payload }));
  return requireParsed(response, "The Group Chat send response was invalid.");
}

/** Sends one Group Chat attachment message after the attachment upload succeeds. */
export async function sendGroupChatAttachmentMessage(groupId: string, attachmentType: GroupChatAttachmentType, attachmentId: string): Promise<GroupChatMessage> {
  const normalizedGroupId = groupId.trim();
  const payload = buildGroupChatAttachmentMessagePayload(attachmentType, attachmentId);
  if (!normalizedGroupId || !payload) throw new GroupChatApiError(422, "A Group Chat and attachment are required.");
  const response = normalizeGroupChatMessage(await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages`, new URLSearchParams(), { method: "POST", body: payload }));
  return requireParsed(response, "The Group Chat attachment message response was invalid.");
}

/** Edits one Group Chat message and returns a complete backend message when supplied. */
export async function editGroupChatMessage(groupId: string, messageId: string, content: string): Promise<GroupChatMessage | null> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  const payload: EditGroupChatMessagePayload | null = buildEditGroupChatMessagePayload(content);
  if (!normalizedGroupId || !normalizedMessageId || !payload) throw new GroupChatApiError(422, "A Group Chat, message, and non-empty replacement are required.");
  const response = await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}`, new URLSearchParams(), { method: "PATCH", body: payload });
  return normalizeGroupChatMessageMutationResponse(response);
}

/** Retracts one Group Chat message and returns a complete backend message when supplied. */
export async function retractGroupChatMessage(groupId: string, messageId: string): Promise<GroupChatMessage | null> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  if (!normalizedGroupId || !normalizedMessageId) throw new GroupChatApiError(422, "A Group Chat and message are required.");
  const response = await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}/retract`, new URLSearchParams(), { method: "POST" });
  return normalizeGroupChatMessageMutationResponse(response);
}

/** Hides one Group Chat message with the required audit reason. */
export async function hideGroupChatMessage(groupId: string, messageId: string, reason: string): Promise<GroupChatMessage | null> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  const payload: HideGroupChatMessagePayload | null = buildHideGroupChatMessagePayload(reason);
  if (!normalizedGroupId || !normalizedMessageId || !payload) throw new GroupChatApiError(422, "A Group Chat, message, and moderation reason are required.");
  const response = await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/messages/${encodeURIComponent(normalizedMessageId)}/hide`, new URLSearchParams(), { method: "POST", body: payload });
  return normalizeGroupChatMessageMutationResponse(response);
}

/** Marks the authenticated member's Group Chat messages as read. */
export async function markGroupChatRead(groupId: string): Promise<void> {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) throw new GroupChatApiError(422, "The Group Chat identifier is required.");
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/read`, new URLSearchParams(), { method: "POST" });
}

/** Loads read status for one Group Chat message on explicit user action. */
export async function getGroupChatMessageReadStatus(groupId: string, messageId: string, signal?: AbortSignal): Promise<GroupChatMessageReadStatus> {
  const normalizedGroupId = groupId.trim();
  const normalizedMessageId = messageId.trim();
  if (!normalizedGroupId || !normalizedMessageId) throw new GroupChatApiError(422, "A Group Chat and message are required.");
  const path = buildGroupChatMessageReadStatusPath(normalizedGroupId, normalizedMessageId);
  if (!path) throw new GroupChatApiError(422, "A Group Chat and message are required.");
  const response = normalizeGroupChatMessageReadStatus(await request<unknown>(path, new URLSearchParams(), { signal }));
  return requireParsed(response, "The Group Chat read-status response was invalid.");
}

/** Updates only the editable Group Chat identity fields. */
export async function updateGroupDetails(groupId: string, payload: UpdateGroupDetailsPayload): Promise<void> {
  await request<unknown>(`/${encodeURIComponent(groupId)}`, new URLSearchParams(), { method: "PATCH", body: buildUpdateGroupDetailsPayload(payload.name, payload.description, payload.avatar_url) });
}

/** Updates only the Group Chat posting permission. */
export async function updateGroupSettings(groupId: string, payload: UpdateGroupSettingsPayload): Promise<void> {
  await request<unknown>(`/${encodeURIComponent(groupId)}/settings`, new URLSearchParams(), { method: "PATCH", body: buildUpdateGroupSettingsPayload(payload.admins_only_posting) });
}

/** Updates personal Group preferences and returns the authoritative GroupResponse. */
export async function updateGroupPreferences(groupId: string, payload: UpdateGroupPreferencesPayload): Promise<GroupChatDetails> {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) throw new GroupChatApiError(422, "The Group Chat identifier is required.");
  const response = await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/preferences`, new URLSearchParams(), { method: "PATCH", body: buildUpdateGroupPreferencesPayload(payload.muted, payload.pinned) });
  return requireParsed(parseGroupDetails(response), "The Group Chat preferences response was invalid.");
}

/** Closes a Group Chat through the documented no-body action endpoint. */
export async function closeGroupChat(groupId: string): Promise<void> {
  await request<unknown>(`/${encodeURIComponent(groupId)}/close`, new URLSearchParams(), { method: "POST" });
}

/** Reopens a closed Group Chat with the backend-required reason. */
export async function reopenGroupChat(groupId: string, reason: string): Promise<void> {
  const payload: ReopenGroupPayload | null = buildReopenGroupPayload(reason);
  if (!payload) throw new GroupChatApiError(422, getGroupChatReopenReasonError(reason) ?? "A valid reopen reason is required.");
  await request<unknown>(`/${encodeURIComponent(groupId)}/reopen`, new URLSearchParams(), { method: "POST", body: payload });
}

/** Loads groups associated with one Training. */
export async function listTrainingGroupChats(trainingId: string, params: GroupChatListParams = {}): Promise<GroupChatListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = makeParams(page, pageSize);
  if (params.q?.trim()) query.set("q", params.q.trim());
  return parseGroupList(await request<unknown>(`/trainings/${encodeURIComponent(trainingId)}/groups`, query, { signal: params.signal }), page, pageSize);
}

/** Creates a real Training Group and returns the created group details. */
export async function createGroup(payload: CreateGroupPayload): Promise<GroupChatDetails> {
  return requireParsed(parseGroupDetails(await request<unknown>("", new URLSearchParams(), { method: "POST", body: payload })), "The Group Chat creation response was invalid.");
}

/** Loads members and pending invitations visible for one Group Chat. */
export async function listGroupChatMembers(groupId: string, params: GroupChatMemberListParams = {}): Promise<GroupChatMemberListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = makeParams(page, pageSize);
  if (params.q?.trim()) query.set("q", params.q.trim());
  return parseMemberList(await request<unknown>(`/${encodeURIComponent(groupId)}/members`, query, { signal: params.signal }), groupId, page, pageSize);
}

/** Changes an active Group Chat member's role through the authenticated role endpoint. */
export async function changeGroupMemberRole(groupId: string, userId: string, role: GroupChatMemberRole, reason = ""): Promise<void> {
  const normalizedGroupId = groupId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedGroupId || !normalizedUserId) throw new GroupChatApiError(422, "The Group Chat and member identifiers are required.");
  const payload: ChangeGroupMemberRolePayload | null = buildChangeGroupMemberRolePayload(role, reason);
  if (!payload) throw new GroupChatApiError(422, "A reason is required when removing an Admin role.");
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/members/${encodeURIComponent(normalizedUserId)}/role`, new URLSearchParams(), { method: "PATCH", body: payload });
}

/** Transfers ownership to an eligible Provider through the authenticated Group Chat API. */
export async function transferGroupOwnership(groupId: string, userId: string): Promise<void> {
  const normalizedGroupId = groupId.trim();
  const payload: TransferGroupOwnershipPayload | null = buildTransferGroupOwnershipPayload(userId);
  if (!normalizedGroupId || !payload) throw new GroupChatApiError(422, "The Group Chat and new owner identifiers are required.");
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/transfer-ownership`, new URLSearchParams(), { method: "POST", body: payload });
}

/** Removes an active member or cancels a pending invitation without sending a request body. */
export async function removeGroupMember(groupId: string, userId: string, reason = ""): Promise<void> {
  const normalizedGroupId = groupId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedGroupId || !normalizedUserId) throw new GroupChatApiError(422, "The Group Chat and member identifiers are required.");
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/members/${encodeURIComponent(normalizedUserId)}`, buildGroupMemberRemovalQuery(reason), { method: "DELETE" });
}

/** Mutes an active Group Chat member's posting without guessing an expiry payload. */
export async function muteGroupMemberPosting(groupId: string, userId: string): Promise<void> {
  const normalizedGroupId = groupId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedGroupId || !normalizedUserId) throw new GroupChatApiError(422, "The Group Chat and member identifiers are required.");
  const payload: GroupChatMemberPostingMutePayload = buildGroupChatMemberMutePayload();
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/members/${encodeURIComponent(normalizedUserId)}/mute-posting`, new URLSearchParams(), { method: "POST", body: payload });
}

/** Restores an active Group Chat member's posting access. */
export async function unmuteGroupMemberPosting(groupId: string, userId: string): Promise<void> {
  const normalizedGroupId = groupId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedGroupId || !normalizedUserId) throw new GroupChatApiError(422, "The Group Chat and member identifiers are required.");
  await request<unknown>(`/${encodeURIComponent(normalizedGroupId)}/members/${encodeURIComponent(normalizedUserId)}/mute-posting`, new URLSearchParams(), { method: "DELETE" });
}

/** Invites additional authorized members using the documented InviteMembers schema. */
export async function inviteGroupMembers(groupId: string, invitees: readonly GroupChatInvitee[]): Promise<GroupChatInvitationResult> {
  const payload: InviteMembersPayload = buildGroupMemberInvitePayload(invitees);
  if (payload.invitees.length === 0) throw new GroupChatApiError(422, "Select at least one valid member.");
  return parseInvitationResult(await request<unknown>(`/${encodeURIComponent(groupId)}/members`, new URLSearchParams(), { method: "POST", body: payload }));
}

/** Invites selected enrolled learners without automatically inviting future enrollments. */
export async function inviteEnrolledLearners(groupId: string, payload: InviteEnrolledLearnersPayload): Promise<GroupChatInvitationResult> {
  const userIds = payload.user_ids ? [...new Set(payload.user_ids.map((id) => id.trim()).filter(Boolean))] : undefined;
  if (userIds && userIds.length === 0) throw new GroupChatApiError(422, "Select at least one eligible learner.");
  return parseInvitationResult(await request<unknown>(`/${encodeURIComponent(groupId)}/members/invite-enrolled`, new URLSearchParams(), { method: "POST", body: { ...payload, user_ids: userIds } }));
}

/** Loads pending invitations for the authenticated recipient. */
export async function listGroupChatInvitations(params: GroupChatInvitationListParams = {}): Promise<GroupChatInvitationListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  return parseInvitationList(await request<unknown>("/invitations", makeParams(page, pageSize), { signal: params.signal }), page, pageSize);
}

/** Loads invitation details before the recipient accepts it. */
export async function getGroupChatInvitation(invitationId: string, signal?: AbortSignal): Promise<GroupChatInvitationDetails> {
  return requireParsed(normalizeGroupChatInvitationDetails(await request<unknown>(`/invitations/${encodeURIComponent(invitationId)}`, new URLSearchParams(), { signal })), "The invitation details response was invalid.");
}

/** Accepts an invitation only after the recipient explicitly provides consent. */
export async function acceptGroupChatInvitation(groupId: string, payload: AcceptGroupInvitationPayload): Promise<void> {
  await request<unknown>(`/${encodeURIComponent(groupId)}/accept`, new URLSearchParams(), { method: "POST", body: payload });
}

/** Declines an invitation after the recipient explicitly confirms the action. */
export async function declineGroupChatInvitation(groupId: string): Promise<void> {
  await request<unknown>(`/${encodeURIComponent(groupId)}/decline`, new URLSearchParams(), { method: "POST" });
}

/** Loads the tenant-scoped Group Chat Provider verification registry. */
export async function listVerifiedGroupChatProviders(params: GroupChatVerifiedProviderListParams = {}): Promise<GroupChatVerifiedProviderListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  return parseVerifiedProviderList(await request<unknown>("/verified-providers", makeParams(page, pageSize), { signal: params.signal }), page, pageSize);
}

/** Loads backend-authoritative verification candidates across all supported tenant roles. */
export async function listGroupChatProviderVerificationCandidates(params: GroupChatProviderVerificationCandidateListParams = {}): Promise<GroupChatProviderVerificationCandidateListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  return parseProviderVerificationCandidateList(
    await request<unknown>("/verified-providers/candidates", buildGroupChatProviderVerificationCandidateQuery(page, pageSize), { signal: params.signal }),
    page,
    pageSize,
  );
}

/** Registers one existing Provider for Group Chat after explicit administrator action. */
export async function registerVerifiedGroupChatProvider(input: RegisterGroupChatVerifiedProviderPayload): Promise<void> {
  const payload = buildVerifiedProviderPayload(input.user_id, input.registration_number, input.registration_council);
  if (!payload) throw new GroupChatApiError(422, "Select a Provider to verify.");
  await request<unknown>("/verified-providers", new URLSearchParams(), { method: "POST", body: payload });
}

/** Revokes one Provider's separate Group Chat verification. */
export async function revokeVerifiedGroupChatProvider(userId: string): Promise<void> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new GroupChatApiError(422, "The Provider identifier is required.");
  await request<unknown>(`/verified-providers/${encodeURIComponent(normalizedUserId)}`, new URLSearchParams(), { method: "DELETE" });
}
