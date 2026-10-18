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

/** An authorized, verified Provider candidate for a Training group. */
export interface GroupChatProvider {
  user_id: string;
  name: string;
  registration_number: string | null;
  is_training_instructor: boolean;
  is_me: boolean;
}

/** Provider candidates returned for a Training. */
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

/** Payload accepted by POST /groups/verified-providers. */
export interface RegisterGroupChatVerifiedProviderPayload {
  user_id: string;
  registration_number?: string;
  registration_council?: string;
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
}

/** Payload accepted by PATCH /groups/{group_id}/settings. */
export interface UpdateGroupSettingsPayload {
  admins_only_posting: boolean;
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
