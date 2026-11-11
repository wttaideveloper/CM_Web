/** Contract types for the Event Group Chat API. These are intentionally separate from Training models. */

export type EventGroupKind = "care" | "program";
export type EventGroupContextType = "program" | "appointment_series" | "care_episode" | "training" | "event";
export type EventGroupStatus = "open" | "closed";
export type EventGroupMemberRole = "owner" | "admin" | "member";
export type EventGroupMemberKind = "provider" | "patient";
export type EventGroupState = "none" | "invited" | "member" | "declined" | "left" | "removed";

export type EventGroupAttendeeReason =
  | "registration_cancelled"
  | "registration_no_show"
  | "registration_not_active"
  | "payment_unpaid"
  | "payment_pending"
  | "payment_failed"
  | "payment_cancelled"
  | "payment_refund_requested"
  | "payment_refunded"
  | "no_account"
  | "duplicate_registration"
  | "already_member"
  | "already_invited";

export interface EventGroupInvitee {
  user_id: string;
  display_name?: string | null;
  is_minor?: boolean;
}

/** Exact Training/Event-safe request body accepted by POST /groups. */
export interface EventGroupCreatePayload {
  name: string;
  kind: "program";
  context_type: "event";
  context_id: string;
  description?: string | null;
  avatar_url?: string | null;
  invitees?: EventGroupInvitee[];
  admins_only_posting?: boolean | null;
  invite_all_registered?: boolean;
  exclude_user_ids?: string[];
}

export interface EventGroupEvent {
  id: string;
  title: string | null;
  status: string | null;
  delivery_mode: string | null;
  start_date: string | null;
  end_date: string | null;
  registered_count: number;
  group_count: number;
  can_create_group: boolean;
  reason: string | null;
}

export interface EventGroupEventListResponse {
  items: EventGroupEvent[];
  total: number;
  page: number;
  page_size: number;
}

export interface EventGroupAttendee {
  registration_id: string;
  name: string | null;
  email: string | null;
  registration_status: string | null;
  payment_status: string | null;
  user_id: string | null;
  can_invite: boolean;
  reason: EventGroupAttendeeReason | null;
  group_state: EventGroupState;
  group_ids: string[];
  registered_at: string | null;
}

export interface EventGroupAttendeeListResponse {
  event_id: string;
  event_title: string | null;
  event_status: string | null;
  items: EventGroupAttendee[];
  total: number;
  page: number;
  page_size: number;
  eligible_total: number;
  walk_in_excluded: number;
  max_members: number;
}

export interface EventGroupProvider {
  user_id: string;
  name: string | null;
  registration_number: string | null;
  is_me: boolean;
}

export interface EventGroupProviderListResponse {
  event_id: string;
  items: EventGroupProvider[];
  total: number;
}

export interface EventGroupEmergencyNotice {
  text: string;
  number: string;
}

export interface EventGroupLimits {
  max_members: number;
  max_admins: number;
  edit_window_minutes: number;
}

export interface EventGroupPermissions {
  can_post: boolean;
  can_edit_group: boolean;
  can_change_settings: boolean;
  can_invite: boolean;
  can_view_members: boolean;
  can_view_pending_invitations: boolean;
  can_remove_members: boolean;
  can_make_admin: boolean;
  can_remove_admin: boolean;
  can_mute_members: boolean;
  can_hide_messages: boolean;
  can_pin_messages: boolean;
  can_close: boolean;
  can_reopen: boolean;
  can_transfer_ownership: boolean;
  can_reassign_owner: boolean;
  can_leave: boolean;
  can_withdraw_consent: boolean;
  can_view_audit: boolean;
  can_set_legal_hold: boolean;
  can_report: boolean;
  can_mute_group: boolean;
}

export interface EventGroupSummary {
  id: string;
  name: string;
  kind: EventGroupKind;
  description: string | null;
  avatar_url: string | null;
  context_type: string | null;
  context_id: string | null;
  context_name: string | null;
  tenant_id: string | null;
  status: EventGroupStatus;
  admins_only_posting: boolean;
  created_by: string;
  created_at: string;
  member_count: number;
  visibility_notice: string;
  emergency_notice: EventGroupEmergencyNotice;
  forwarding_blocked: boolean;
  screenshots_blocked: boolean;
  limits: EventGroupLimits;
  my_role: EventGroupMemberRole | null;
  my_kind: EventGroupMemberKind | null;
  permissions: EventGroupPermissions | null;
  muted: boolean;
  pinned: boolean;
  is_archived: boolean;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  retention_started_at: string | null;
  retention_until: string | null;
  legal_hold: boolean;
}

export interface EventGroupListResponse {
  items: EventGroupSummary[];
  total: number;
}

export interface InviteRegisteredPayload {
  user_ids?: string[] | null;
  all_eligible?: boolean;
  exclude_user_ids?: string[];
}

export interface InviteRegisteredResponse {
  invited: string[];
  skipped: string[];
  not_invited_group_full: number;
  no_account: number;
  free_places: number;
}

export interface EventGroupEventListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface EventGroupAttendeeListParams {
  q?: string;
  eligibleOnly?: boolean;
  registrationStatus?: string;
  paymentStatus?: string;
  notInGroup?: boolean;
  groupId?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface EventGroupProviderListParams {
  q?: string;
  signal?: AbortSignal;
}

export interface EventGroupApiRequest {
  (path: string, init?: RequestInit): Promise<Response>;
}
