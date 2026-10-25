/** A Training row returned by the authorized Group Chat Training endpoint. */
export interface GroupChatTraining {
  id: string;
  title: string;
  status: string;
  delivery_mode: string | null;
  instructor_name: string | null;
  instructor_user_id: string | null;
  instructor_is_verified_provider: boolean;
  enrolled_count: number | null;
  group_count: number | null;
  created_at: string | null;
}

/** Pagination metadata returned by Group Chat list endpoints. */
export interface GroupChatPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Paginated Training selection response. */
export interface GroupChatTrainingListResponse {
  items: GroupChatTraining[];
  pagination: GroupChatPagination;
}

/** One enrolled learner candidate returned for a Training. */
export interface GroupChatLearner {
  enrolment_id: string;
  name: string;
  email: string | null;
  enrolment_status: string;
  user_id: string | null;
  can_invite: boolean;
  reason: string | null;
  group_state: string | null;
  group_ids: string[];
  enrolled_at: string | null;
}

/** Paginated learner candidates and the backend group capacity. */
export interface GroupChatLearnerListResponse {
  training_id: string;
  training_title: string | null;
  items: GroupChatLearner[];
  pagination: GroupChatPagination;
  eligible_total: number | null;
  max_members: number;
}

/** An authorized, verified Provider returned for Training invitations; this is not a Group membership or ownership-eligibility record. */
export interface GroupChatProvider {
  user_id: string;
  name: string;
  registration_number: string | null;
  is_training_instructor: boolean;
  is_me: boolean;
}

/** Provider candidates returned by the Training invitation lookup. Ownership eligibility comes only from active Group members. */
export interface GroupChatProviderListResponse {
  training_id: string;
  instructor_name: string | null;
  items: GroupChatProvider[];
  pagination: GroupChatPagination;
}

/** Server-declared permissions for a Group Chat resource. */
export interface GroupChatPermissions {
  can_post: boolean | null;
  can_edit_group: boolean | null;
  can_change_settings: boolean | null;
  can_invite: boolean | null;
  can_view_members: boolean | null;
  can_view_pending_invitations: boolean | null;
  can_remove_members: boolean | null;
  can_make_admin: boolean | null;
  can_remove_admin: boolean | null;
  can_mute_members: boolean | null;
  can_hide_messages: boolean | null;
  can_pin_messages: boolean | null;
  can_close: boolean | null;
  can_reopen: boolean | null;
  can_transfer_ownership: boolean | null;
  can_reassign_owner: boolean | null;
  can_leave: boolean | null;
  can_view_audit: boolean | null;
  can_set_legal_hold: boolean | null;
  can_report: boolean | null;
  can_mute_group: boolean | null;
}

/** A group summary returned by the Group Chat list endpoint. */
export interface GroupChatSummary {
  id: string;
  name: string;
  description: string | null;
  kind: string | null;
  context_type: string | null;
  context_id: string | null;
  context_name: string | null;
  status: string | null;
  member_count: number | null;
  max_members: number | null;
  pending_invitation_count: number | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  owner_name: string | null;
  owner_user_id: string | null;
  avatar_url: string | null;
  admins_only_posting: boolean | null;
  muted: boolean | null;
  pinned: boolean | null;
  is_archived: boolean | null;
  visibility_notice: string | null;
  emergency_notice: string | null;
  my_role: string | null;
  permissions: GroupChatPermissions;
}

/** Paginated Group Chat list response. */
export interface GroupChatListResponse {
  items: GroupChatSummary[];
  pagination: GroupChatPagination;
}

/** Details returned for one Group Chat. */
export interface GroupChatDetails extends GroupChatSummary {
  training_title: string | null;
  owner: GroupChatMember | null;
}

/** Request body accepted by POST /groups/{group_id}/reports. */
export type GroupChatReportReason = "harassment" | "privacy" | "health_information" | "spam" | "inappropriate" | "safety" | "other";

export interface CreateGroupChatReportPayload {
  message_id: string | null;
  reason: GroupChatReportReason;
  details: string | null;
}

/** Report record returned by the Group Chat reporting endpoint. */
export interface GroupChatReport {
  id: string;
  conversation_id: string;
  message_id: string | null;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

/** Status values accepted by the Compliance report list and review endpoints. */
export type GroupChatComplianceReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

/** Status values accepted when updating a Compliance report. */
export type GroupChatComplianceReportUpdateStatus = Exclude<GroupChatComplianceReportStatus, "open">;

/** A clinic-scoped report record returned by the Compliance reports endpoints. */
export interface GroupChatComplianceReport {
  id: string;
  conversation_id: string;
  message_id: string | null;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: GroupChatComplianceReportStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

/** Response returned by GET /groups/reports. */
export interface GroupChatComplianceReportListResponse {
  items: GroupChatComplianceReport[];
  total: number;
}

/** Filters accepted by GET /groups/reports. */
export interface GroupChatComplianceReportListParams {
  status?: GroupChatComplianceReportStatus;
  groupId?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** JSON-safe metadata attached to a read-only Group Chat audit entry. */
export type GroupChatAuditDetailsValue = string | number | boolean | null | GroupChatAuditDetailsValue[] | { [key: string]: GroupChatAuditDetailsValue };

/** One immutable audit event returned for an authorized Group Chat. */
export interface GroupChatAuditEntry {
  id: string;
  conversation_id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_user_id: string | null;
  message_id: string | null;
  reason: string | null;
  details: { [key: string]: GroupChatAuditDetailsValue } | null;
  created_at: string;
}

/** Response returned by GET /groups/{group_id}/audit. */
export interface GroupChatAuditListResponse {
  items: GroupChatAuditEntry[];
  total: number;
}

/** Page and filter parameters accepted by the Group Chat audit endpoint. */
export interface GroupChatAuditListParams {
  action?: string;
  targetUserId?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** Request body accepted by PATCH /groups/reports/{report_id}. */
export interface UpdateGroupChatComplianceReportPayload {
  status: GroupChatComplianceReportUpdateStatus;
  note: string | null;
}

/** Clinic Grievance Officer contact returned for the authenticated Group Chat context. */
export interface GroupChatGrievanceOfficer {
  name: string | null;
  email: string | null;
  phone: string | null;
  configured: boolean;
}

export type GroupChatAttachmentType = "image" | "document" | "audio" | "video";

/** Attachment metadata returned by the existing Chat attachment infrastructure. */
export interface GroupChatAttachment {
  id: string;
  file_name: string;
  attachment_type: GroupChatAttachmentType;
  download_url: string | null;
  file_size: number | null;
  mime_type: string | null;
}

/** Authorized binary response returned by the existing Chat attachment download endpoint. */
export interface GroupChatAttachmentDownloadResponse {
  blob: Blob;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
}

export interface GroupChatAttachmentDisplayMetadata {
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
}

/** Optional attachment metadata embedded in a Group Chat message response. */
export interface GroupChatMessageAttachment {
  id: string | null;
  attachment_id: string | null;
  file_name: string | null;
  filename: string | null;
  attachment_type: string | null;
  download_url: string | null;
  file_size: number | null;
  mime_type: string | null;
}

export interface GroupChatReplyReference {
  id: string;
  sender_name: string;
  preview: string;
  is_hidden: boolean;
}

/** Message returned by the Group Chat REST history and send endpoints. */
export interface GroupChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_kind: string;
  message_type: string;
  content: string | null;
  attachment_id: string | null;
  file_name: string | null;
  filename: string | null;
  download_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  attachment: GroupChatMessageAttachment | null;
  status: string;
  placeholder: string | null;
  reply_to: GroupChatReplyReference | null;
  mentions: string[];
  mentions_all: boolean;
  mentions_me: boolean;
  is_edited: boolean;
  edited_at: string | null;
  pinned: boolean;
  reactions: Record<string, unknown>;
  my_reactions: string[];
  read_by: string[] | null;
  created_at: string;
}

/** Cursor-paginated Group Chat message history response. */
export interface GroupChatMessageHistoryResponse {
  items: GroupChatMessage[];
  has_more: boolean;
  next_cursor: string | null;
  unread_count: number;
  first_unread_message_id: string | null;
  pinned_count: number;
}

/** Read status returned for one authorized Group Chat message. */
export interface GroupChatMessageReadStatus {
  message_id: string;
  seen_by_count: number;
  recipient_count: number;
  label: string;
  seen_by: string[];
}

/** Allowed reaction configuration returned for an eligible Group Chat. */
export interface GroupChatReactionSettings {
  enabled: boolean;
  emojis: string[];
}

/** Request body for adding one reaction to a Group Chat message. */
export interface GroupChatReactionPayload {
  emoji: string;
}

/** Query options for Group Chat message history. */
export interface GroupChatMessageListParams {
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

/** Query options for the Group Chat message search endpoint. */
export interface GroupChatSearchParams {
  limit?: number;
  signal?: AbortSignal;
}

/** Query options for the confirmed Shared Files response. */
export interface GroupChatFilesListParams {
  limit?: number;
  signal?: AbortSignal;
}

/** One authorized file metadata record returned by GET /groups/{group_id}/files. */
export interface GroupChatSharedFile {
  attachment_id: string;
  message_id: string;
  sender_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  attachment_type: GroupChatAttachmentType;
  created_at: string;
}

/** Confirmed response envelope returned by GET /groups/{group_id}/files. */
export interface GroupChatSharedFilesResponse {
  items: GroupChatSharedFile[];
}

/** Request body accepted by the Group Chat text-message endpoint. */
export interface SendGroupChatMessagePayload {
  content: string;
  reply_to_id?: string;
}

/** Request body documented for a Group Chat attachment message. */
export interface SendGroupChatAttachmentMessagePayload {
  message_type: GroupChatAttachmentType;
  attachment_id: string;
}

/** Request body accepted by PATCH /groups/{group_id}/messages/{message_id}. */
export interface EditGroupChatMessagePayload {
  content: string;
}

/** Request body accepted by POST /groups/{group_id}/messages/{message_id}/hide. */
export interface HideGroupChatMessagePayload {
  reason: string;
}

/** A member returned by the Group Chat membership endpoint. */
export interface GroupChatMember {
  id: string;
  user_id: string | null;
  name: string;
  role: string;
  member_kind: string | null;
  membership_status: string;
  joined_at: string | null;
  is_current_user: boolean;
  can_manage: boolean | null;
  is_verified_provider: boolean | null;
  can_be_admin: boolean | null;
  can_receive_ownership: boolean | null;
  posting_muted: boolean | null;
  posting_muted_until: string | null;
}

/** Role values accepted by the Group Chat member-role endpoint. */
export type GroupChatMemberRole = "admin" | "member";

/** Payload accepted by PATCH /groups/{group_id}/members/{user_id}/role. */
export interface ChangeGroupMemberRolePayload {
  role: GroupChatMemberRole;
  reason?: string;
}

/** Payload accepted by POST /groups/{group_id}/transfer-ownership. */
export interface TransferGroupOwnershipPayload {
  user_id: string;
}

/** Request body accepted by POST /groups/{group_id}/reassign-owner. */
export interface ReassignGroupOwnerPayload {
  user_id: string;
  reason: string;
}

/** Confirmed live success response returned by POST /groups/{group_id}/reassign-owner. */
export interface ReassignGroupOwnerObjectResponse {
  conversation_id: string;
  owner_id: string;
}

/** Success responses accepted from the documented and deployed Group Chat APIs. */
export type ReassignGroupOwnerResponse = string | ReassignGroupOwnerObjectResponse;

/** Optional fields accepted by the backend mute request; timed mute is not enabled yet. */
export interface GroupChatMemberPostingMutePayload {
  until?: string | null;
  reason?: string | null;
}

/** A pending invitation visible to the authorized caller. */
export interface GroupChatInvitation {
  id: string;
  group_id: string;
  group_name: string;
  description: string | null;
  invited_by_name: string | null;
  status: string;
  created_at: string | null;
  member_names: string[];
  visibility_notice: string | null;
  emergency_notice: string | null;
  guardian_consent_required: boolean;
}

/** Members and pending invitations for a group. */
export interface GroupChatMemberListResponse {
  group_id: string;
  items: GroupChatMember[];
  pending_invitations: GroupChatInvitation[];
  pagination: GroupChatPagination;
  malformed: boolean;
}

/** Paginated pending invitations for the authenticated user. */
export interface GroupChatInvitationListResponse {
  items: GroupChatInvitation[];
  pagination: GroupChatPagination;
}

/** Detailed invitation response before acceptance. */
export interface GroupChatInvitationDetails extends GroupChatInvitation {
  purpose: string | null;
  provider_names: string[];
  what_members_can_see: string | null;
  guardian_consent_text: string | null;
}

/** A Provider registered in the separate Group Chat verification registry. */
export interface GroupChatVerifiedProvider {
  user_id: string;
  display_name: string | null;
  email: string | null;
  verified_at: string | null;
}

/** Paginated Group Chat verification registry response. */
export interface GroupChatVerifiedProviderListResponse {
  items: GroupChatVerifiedProvider[];
  pagination: GroupChatPagination;
}

/** Query options for the Group Chat verification registry. */
export interface GroupChatVerifiedProviderListParams {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** A backend-authoritative candidate for Group Chat Provider verification. */
export interface GroupChatProviderVerificationCandidate {
  user_id: string;
  name: string | null;
  roles: string[];
  verification: string | null;
  registration_number: string | null;
}

/** Paginated candidates returned by the Group Chat verification directory. */
export interface GroupChatProviderVerificationCandidateListResponse {
  items: GroupChatProviderVerificationCandidate[];
  pagination: GroupChatPagination;
}

/** Query options for the Group Chat verification candidate directory. */
export interface GroupChatProviderVerificationCandidateListParams {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** Payload accepted by POST /groups/verified-providers. */
export interface RegisterGroupChatVerifiedProviderPayload {
  user_id: string;
  registration_number?: string;
  registration_council?: string;
}

/** Response returned by POST /api/v1/uploads/ for a Group Chat avatar. */
export interface GroupAvatarUploadResponse {
  url: string;
}

/** Payload accepted by POST /groups. */
export interface CreateGroupPayload {
  name: string;
  kind: "program";
  context_type: "training";
  context_id: string;
  description: string;
  invitees: Array<{ user_id: string }>;
  admins_only_posting: boolean;
  avatar_url?: string;
}

/** One additional member accepted by POST /groups/{group_id}/members. */
export interface GroupChatInvitee {
  user_id: string;
  display_name?: string;
  is_minor?: boolean;
}

/** Payload accepted by POST /groups/{group_id}/members. */
export interface InviteMembersPayload {
  invitees: GroupChatInvitee[];
}

/** Payload accepted by POST /groups/{group_id}/members/invite-enrolled. */
export interface InviteEnrolledLearnersPayload {
  user_ids?: string[];
  all_eligible?: boolean;
  exclude_user_ids?: string[];
}

/** Outcome returned by the member invitation endpoints. */
export interface GroupChatInvitationResult {
  invited: string[];
  skipped: string[];
}

/** Payload accepted by POST /groups/{group_id}/accept. */
export interface AcceptGroupInvitationPayload {
  consent: true;
  display_name?: string;
  guardian_name?: string;
  guardian_relationship?: string;
}

/** Payload accepted by PATCH /groups/{group_id}. */
export interface UpdateGroupDetailsPayload {
  name: string;
  description: string;
  avatar_url?: string;
}

/** Payload accepted by PATCH /groups/{group_id}/settings. */
export interface UpdateGroupSettingsPayload {
  admins_only_posting: boolean;
}

/** Request body accepted by PATCH /groups/{group_id}/preferences. */
export interface UpdateGroupPreferencesPayload {
  muted: boolean | null;
  muted_until?: string | null;
  pinned: boolean | null;
}

/** A personal Group Chat consent record returned by GET /groups/consents/me. */
export interface GroupChatConsentRecord {
  record_id: string | null;
  conversation_id: string;
  group_name: string | null;
  granted_at: string | null;
  withdrawn_at: string | null;
  is_minor: boolean | null;
  guardian_name: string | null;
  guardian_relationship: string | null;
  notice: Record<string, unknown>;
}

/** Known display-safe fields from the backend consent notice snapshot. */
export interface GroupChatConsentNotice {
  name: string | null;
  kind: string | null;
  purpose: string | null;
  invited_at: string | null;
  description: string | null;
  member_count: number | null;
  provider_names: string[];
  invited_by_name: string | null;
  visibility_notice: string | null;
  what_members_can_see: string | null;
  emergency_notice: {
    text: string | null;
    number: string | null;
  } | null;
  requires_guardian_consent: boolean | null;
}

/** Personal consent records for the authenticated Group Chat user. */
export interface GroupChatConsentListResponse {
  items: GroupChatConsentRecord[];
}

/** Personal data request returned by the confirmed Group Chat history endpoint. */
export type GroupChatDataRequestStatus = "received" | "in_progress" | "completed" | "failed";

export interface GroupChatDataRequest {
  id: string;
  conversation_id: string | null;
  request_type: string;
  status: GroupChatDataRequestStatus;
  note: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  error_code: string | null;
}

/** Browser-safe result for the authenticated data-export attachment endpoint. */
export interface GroupChatDataRequestDownloadResponse {
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/** Request body accepted by POST /groups/data-requests. */
export interface CreateGroupChatDataRequestPayload {
  conversation_id: string | null;
  note: string | null;
}

/** Observed successful response from POST /groups/{group_id}/consent/withdraw. */
export interface GroupChatConsentWithdrawalResponse {
  conversation_id: string;
  status: "withdrawn";
}

/** Observed successful response from POST /groups/{group_id}/leave. */
export interface GroupChatLeaveResponse {
  conversation_id: string;
  status: "left";
}

/** Payload accepted by POST /groups/{group_id}/reopen. */
export interface ReopenGroupPayload {
  reason: string;
}

/** Query options for the authorized Training selection endpoint. */
export interface GroupChatTrainingListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** Query options for the read-only learner roster endpoint. */
export interface GroupChatLearnerListParams {
  q?: string;
  eligibleOnly?: boolean;
  enrolmentStatus?: string;
  notInGroup?: boolean;
  groupId?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** Query options for the authorized Provider endpoint. */
export interface GroupChatProviderListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** Query options for Group Chat lists. */
export interface GroupChatListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** Query options for group members. */
export interface GroupChatMemberListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/** Query options for pending invitations. */
export interface GroupChatInvitationListParams {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}
