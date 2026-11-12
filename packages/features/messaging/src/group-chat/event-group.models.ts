import type {
  EventGroupAttendee,
  EventGroupAttendeeReason,
  EventGroupAttendeeListResponse,
  EventGroupCreatePayload,
  EventGroupEmergencyNotice,
  EventGroupEvent,
  EventGroupEventListResponse,
  EventGroupInvitee,
  EventGroupLimits,
  EventGroupListResponse,
  EventGroupPermissions,
  EventGroupProvider,
  EventGroupProviderListResponse,
  EventGroupSummary,
  EventGroupState,
  InviteRegisteredPayload,
  InviteRegisteredResponse,
} from "./event-group.types";

const ATTENDEE_REASONS: readonly EventGroupAttendeeReason[] = [
  "registration_cancelled", "registration_no_show", "registration_not_active", "payment_unpaid", "payment_pending",
  "payment_failed", "payment_cancelled", "payment_refund_requested", "payment_refunded", "no_account",
  "duplicate_registration", "already_member", "already_invited",
];
const GROUP_STATES: readonly EventGroupState[] = ["none", "invited", "member", "declined", "left", "removed"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : stringValue(value);
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

function nullableEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : [];
}

function requiredString(value: unknown): string | null {
  return stringValue(value);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns whether a value is a platform user identifier accepted by the Event API contract. */
export function isValidEventGroupUserId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function normalizeEmergencyNotice(value: unknown): EventGroupEmergencyNotice | null {
  if (!isRecord(value)) return null;
  const text = stringValue(value.text);
  const number = stringValue(value.number);
  return text && number ? { text, number } : null;
}

function normalizeLimits(value: unknown): EventGroupLimits | null {
  if (!isRecord(value)) return null;
  if (typeof value.max_members !== "number" || typeof value.max_admins !== "number" || typeof value.edit_window_minutes !== "number") return null;
  return { max_members: value.max_members, max_admins: value.max_admins, edit_window_minutes: value.edit_window_minutes };
}

function normalizePermissions(value: unknown): EventGroupPermissions | null {
  if (!isRecord(value)) return null;
  const keys: (keyof EventGroupPermissions)[] = [
    "can_post", "can_edit_group", "can_change_settings", "can_invite", "can_view_members", "can_view_pending_invitations",
    "can_remove_members", "can_make_admin", "can_remove_admin", "can_mute_members", "can_hide_messages", "can_pin_messages",
    "can_close", "can_reopen", "can_transfer_ownership", "can_reassign_owner", "can_leave", "can_withdraw_consent",
    "can_view_audit", "can_set_legal_hold", "can_report", "can_mute_group",
  ];
  if (!keys.every((key) => typeof value[key] === "boolean")) return null;
  return Object.fromEntries(keys.map((key) => [key, value[key]])) as unknown as EventGroupPermissions;
}

/** Normalizes one Event candidate while preserving the server's eligibility decision. */
export function normalizeEventGroupEvent(value: unknown): EventGroupEvent | null {
  if (!isRecord(value)) return null;
  const id = requiredString(value.id);
  if (!id || typeof value.can_create_group !== "boolean") return null;
  return {
    id,
    title: nullableString(value.title),
    status: nullableString(value.status),
    delivery_mode: nullableString(value.delivery_mode),
    start_date: nullableString(value.start_date),
    end_date: nullableString(value.end_date),
    registered_count: numberValue(value.registered_count, 0),
    group_count: numberValue(value.group_count, 0),
    can_create_group: value.can_create_group,
    reason: nullableString(value.reason),
  };
}

/** Normalizes the exact page metadata returned by GET /groups/events. */
export function normalizeEventGroupEventsResponse(value: unknown): EventGroupEventListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items.map(normalizeEventGroupEvent).filter((item): item is EventGroupEvent => item !== null);
  if (typeof value.total !== "number" || typeof value.page !== "number" || typeof value.page_size !== "number") return null;
  return { items, total: value.total, page: value.page, page_size: value.page_size };
}

/** Normalizes one attendee without deriving a platform user ID from registration or email. */
export function normalizeEventGroupAttendee(value: unknown): EventGroupAttendee | null {
  if (!isRecord(value)) return null;
  const registrationId = requiredString(value.registration_id);
  if (!registrationId || typeof value.can_invite !== "boolean") return null;
  return {
    registration_id: registrationId,
    name: nullableString(value.name),
    email: nullableString(value.email),
    registration_status: nullableString(value.registration_status),
    payment_status: nullableString(value.payment_status),
    user_id: nullableString(value.user_id),
    can_invite: value.can_invite,
    reason: nullableEnum(value.reason, ATTENDEE_REASONS),
    group_state: enumValue(value.group_state, GROUP_STATES, "none"),
    group_ids: stringArray(value.group_ids),
    registered_at: nullableString(value.registered_at),
  };
}

/** Normalizes attendee eligibility and capacity metadata, including walk-in exclusions. */
export function normalizeEventGroupAttendeesResponse(value: unknown): EventGroupAttendeeListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const eventId = requiredString(value.event_id);
  if (!eventId || typeof value.total !== "number" || typeof value.page !== "number" || typeof value.page_size !== "number" || typeof value.eligible_total !== "number" || typeof value.max_members !== "number") return null;
  return {
    event_id: eventId,
    event_title: nullableString(value.event_title),
    event_status: nullableString(value.event_status),
    items: value.items.map(normalizeEventGroupAttendee).filter((item): item is EventGroupAttendee => item !== null),
    total: value.total,
    page: value.page,
    page_size: value.page_size,
    eligible_total: value.eligible_total,
    walk_in_excluded: numberValue(value.walk_in_excluded, 0),
    max_members: value.max_members,
  };
}

/** Normalizes one verified Provider candidate; Provider identity is always user_id. */
export function normalizeEventGroupProvider(value: unknown): EventGroupProvider | null {
  if (!isRecord(value)) return null;
  const userId = requiredString(value.user_id);
  if (!userId || !isValidEventGroupUserId(userId)) return null;
  return { user_id: userId, name: nullableString(value.name), registration_number: nullableString(value.registration_number), is_me: booleanValue(value.is_me, false) };
}

export function normalizeEventGroupProvidersResponse(value: unknown): EventGroupProviderListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const eventId = requiredString(value.event_id);
  if (!eventId || typeof value.total !== "number") return null;
  return { event_id: eventId, items: value.items.map(normalizeEventGroupProvider).filter((item): item is EventGroupProvider => item !== null), total: value.total };
}

/** Normalizes the full GroupResponse contract used by the Event group list. */
export function normalizeEventGroupSummary(value: unknown): EventGroupSummary | null {
  if (!isRecord(value)) return null;
  const id = requiredString(value.id);
  const name = requiredString(value.name);
  const createdBy = requiredString(value.created_by);
  const createdAt = requiredString(value.created_at);
  const visibilityNotice = requiredString(value.visibility_notice);
  const emergencyNotice = normalizeEmergencyNotice(value.emergency_notice);
  const limits = normalizeLimits(value.limits);
  const kind = nullableEnum(value.kind, ["care", "program"]);
  const status = nullableEnum(value.status, ["open", "closed"]);
  if (!id || !name || !createdBy || !createdAt || !visibilityNotice || !emergencyNotice || !limits || !kind || !status) return null;
  if (typeof value.admins_only_posting !== "boolean" || typeof value.member_count !== "number") return null;
  return {
    id,
    name,
    kind,
    description: nullableString(value.description),
    avatar_url: nullableString(value.avatar_url),
    context_type: nullableString(value.context_type),
    context_id: nullableString(value.context_id),
    context_name: nullableString(value.context_name),
    tenant_id: nullableString(value.tenant_id),
    status,
    admins_only_posting: value.admins_only_posting,
    created_by: createdBy,
    created_at: createdAt,
    member_count: value.member_count,
    visibility_notice: visibilityNotice,
    emergency_notice: emergencyNotice,
    forwarding_blocked: booleanValue(value.forwarding_blocked, true),
    screenshots_blocked: booleanValue(value.screenshots_blocked, true),
    limits,
    my_role: nullableEnum(value.my_role, ["owner", "admin", "member"]),
    my_kind: nullableEnum(value.my_kind, ["provider", "patient"]),
    permissions: value.permissions === null || value.permissions === undefined ? null : normalizePermissions(value.permissions),
    muted: booleanValue(value.muted, false),
    pinned: booleanValue(value.pinned, false),
    is_archived: booleanValue(value.is_archived, false),
    unread_count: numberValue(value.unread_count, 0),
    last_message_at: nullableString(value.last_message_at),
    last_message_preview: nullableString(value.last_message_preview),
    closed_at: nullableString(value.closed_at),
    closed_reason: nullableString(value.closed_reason),
    retention_started_at: nullableString(value.retention_started_at),
    retention_until: nullableString(value.retention_until),
    legal_hold: booleanValue(value.legal_hold, false),
  };
}

export function normalizeEventGroupListResponse(value: unknown): EventGroupListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items) || typeof value.total !== "number") return null;
  return { items: value.items.map(normalizeEventGroupSummary).filter((item): item is EventGroupSummary => item !== null), total: value.total };
}

export function normalizeInviteRegisteredResponse(value: unknown): InviteRegisteredResponse | null {
  if (!isRecord(value) || !Array.isArray(value.invited) || typeof value.free_places !== "number") return null;
  return {
    invited: stringArray(value.invited),
    skipped: stringArray(value.skipped),
    not_invited_group_full: numberValue(value.not_invited_group_full, 0),
    no_account: numberValue(value.no_account, 0),
    free_places: value.free_places,
  };
}

function normalizedIds(value: readonly string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return [...new Set(value.map((id) => id.trim()).filter(Boolean))];
}

/** Builds the documented Event create body without mapping registration IDs to user IDs. */
export function buildEventGroupCreatePayload(input: {
  name: string;
  contextId: string;
  description?: string | null;
  avatarUrl?: string | null;
  invitees?: readonly EventGroupInvitee[];
  adminsOnlyPosting?: boolean | null;
  inviteAllRegistered?: boolean;
  excludeUserIds?: readonly string[];
}): EventGroupCreatePayload {
  const invitees = new Map<string, EventGroupInvitee>();
  for (const invitee of input.invitees ?? []) {
    const userId = invitee.user_id.trim();
    if (!userId) continue;
    invitees.set(userId, { user_id: userId, ...(invitee.display_name?.trim() ? { display_name: invitee.display_name.trim() } : {}), ...(invitee.is_minor === undefined ? {} : { is_minor: invitee.is_minor }) });
  }
  return {
    name: input.name.trim(),
    kind: "program",
    context_type: "event",
    context_id: input.contextId.trim(),
    ...(input.description === undefined ? {} : { description: input.description?.trim() || null }),
    ...(input.avatarUrl === undefined ? {} : { avatar_url: input.avatarUrl?.trim() || null }),
    ...(invitees.size ? { invitees: [...invitees.values()] } : {}),
    ...(input.adminsOnlyPosting === undefined ? {} : { admins_only_posting: input.adminsOnlyPosting }),
    ...(input.inviteAllRegistered === undefined ? {} : { invite_all_registered: input.inviteAllRegistered }),
    ...(input.excludeUserIds === undefined ? {} : { exclude_user_ids: normalizedIds(input.excludeUserIds) ?? [] }),
  };
}

/** Builds the exact registered-invite body and deduplicates only platform user IDs. */
export function buildInviteRegisteredPayload(input: InviteRegisteredPayload): InviteRegisteredPayload {
  const userIds = input.user_ids === null ? null : normalizedIds(input.user_ids);
  return {
    ...(userIds === undefined ? {} : { user_ids: userIds }),
    ...(input.all_eligible === undefined ? {} : { all_eligible: input.all_eligible }),
    ...(input.exclude_user_ids === undefined ? {} : { exclude_user_ids: normalizedIds(input.exclude_user_ids) ?? [] }),
  };
}

/** Validates the documented Event Group create constraints before any gated upload or create request. */
export function validateEventGroupCreatePayload(payload: EventGroupCreatePayload): string | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!payload.name.trim() || payload.name.trim().length > 120) return "The Event Group name must be between 1 and 120 characters.";
  if (payload.description !== undefined && payload.description !== null && payload.description.length > 500) return "The Event Group description must be 500 characters or fewer.";
  if (!uuid.test(payload.context_id)) return "The selected Event identifier is invalid.";
  if (payload.avatar_url !== undefined && payload.avatar_url !== null && payload.avatar_url.length > 500) return "The Event Group avatar URL must be 500 characters or fewer.";
  if (payload.invitees?.some((invitee) => !uuid.test(invitee.user_id))) return "One or more selected invitee identities are invalid.";
  if (payload.exclude_user_ids?.some((userId) => !uuid.test(userId))) return "One or more excluded attendee identities are invalid.";
  return null;
}
