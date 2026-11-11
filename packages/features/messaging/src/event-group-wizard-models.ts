import type { EventGroupAttendee, EventGroupAttendeeListParams, EventGroupAttendeeListResponse, EventGroupAttendeeReason, EventGroupEvent, EventGroupEventListParams, EventGroupProvider } from "./group-chat/event-group.types";

export const EVENT_GROUP_PAGE_SIZE = 10;
export const EVENT_GROUP_ATTENDEE_PAGE_SIZE = 25;

export type EventGroupCreationStep = "event" | "attendees" | "details" | "review";

export interface EventGroupListQueryInput {
  search: string;
  status?: string;
  page: number;
}

export interface EventGroupAttendeeQueryInput {
  page: number;
  search: string;
  status: string;
  paymentStatus: string;
}

export interface EventGroupCapacitySummary {
  maxMembers: number | null;
  ownerReserved: number;
  selectedMemberCount: number;
  remainingMemberSlots: number | null;
  inviteAllMayBeCapped: boolean;
}

export interface EventGroupReviewValidationInput {
  eventId: string;
  groupName: string;
  description: string;
  attendeeUserIds: readonly string[];
  providerUserIds: readonly string[];
  inviteAllRegistered: boolean;
  maxMembers: number | null;
}

export type EventGroupReviewValidationError = "invalid_event" | "invalid_name" | "description_too_long" | "duplicate_invitee" | "invitee_required" | "capacity_exceeded";

export type EventGroupWizardEvent = EventGroupEvent;
export type EventGroupWizardAttendee = EventGroupAttendee;

/** Builds the backend-scoped Event Group event query without selecting a tenant client-side. */
export function buildEventGroupListParams(input: EventGroupListQueryInput): EventGroupEventListParams {
  return {
    q: input.search.trim() || undefined,
    ...(input.status?.trim() ? { status: input.status.trim() } : {}),
    page: input.page,
    pageSize: EVENT_GROUP_PAGE_SIZE,
  };
}

/** Builds the read-only, server-authorized attendee query used by the provisional Event Group picker. */
export function buildEventGroupAttendeeFilters(input: EventGroupAttendeeQueryInput): EventGroupAttendeeListParams {
  return {
    page: input.page,
    pageSize: EVENT_GROUP_ATTENDEE_PAGE_SIZE,
    q: input.search.trim() || undefined,
    eligibleOnly: false,
    registrationStatus: input.status || undefined,
    paymentStatus: input.paymentStatus || undefined,
    notInGroup: false,
  };
}

/** Allows the wizard to reach Provider selection after an empty attendee response. */
export function canContinueEventGroupAttendeeStep(input: { hasResponse: boolean; isError: boolean }): boolean {
  return input.hasResponse && !input.isError;
}

/** Validates the final Event draft without enabling or issuing the gated mutation. */
export function validateEventGroupReview(input: EventGroupReviewValidationInput): EventGroupReviewValidationError | null {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.eventId)) return "invalid_event";
  if (!input.groupName.trim() || input.groupName.trim().length > 120) return "invalid_name";
  if (input.description.length > 500) return "description_too_long";
  const allUserIds = [...input.attendeeUserIds, ...input.providerUserIds];
  if (new Set(allUserIds).size !== allUserIds.length) return "duplicate_invitee";
  if (!input.inviteAllRegistered && allUserIds.length === 0) return "invitee_required";
  const selectedInviteeCount = input.inviteAllRegistered ? input.providerUserIds.length : allUserIds.length;
  if (input.maxMembers !== null && selectedInviteeCount > Math.max(0, input.maxMembers - 1)) return "capacity_exceeded";
  return null;
}

/** Separates registration-level eligibility from inviteable platform accounts on the current page. */
export function summarizeEventGroupAttendeeEligibility(response: Pick<EventGroupAttendeeListResponse, "items" | "eligible_total">): { eligibleRegistrationTotal: number; inviteableOnPage: number } {
  return {
    eligibleRegistrationTotal: response.eligible_total,
    inviteableOnPage: response.items.filter((attendee) => Boolean(attendee.user_id) && attendee.can_invite).length,
  };
}

/** Adds one registration to a cross-page selection without creating duplicate entries. */
export function addEventAttendeeSelection(selection: Readonly<Record<string, EventGroupAttendee>>, attendee: EventGroupAttendee): Readonly<Record<string, EventGroupAttendee>> {
  if (!attendee.user_id || !attendee.can_invite) return selection;
  return selection[attendee.user_id] ? selection : { ...selection, [attendee.user_id]: attendee };
}

/** Removes one platform user from a cross-page selection. */
export function removeEventAttendeeSelection(selection: Readonly<Record<string, EventGroupAttendee>>, userId: string): Readonly<Record<string, EventGroupAttendee>> {
  if (!selection[userId]) return selection;
  const next = { ...selection };
  delete next[userId];
  return next;
}

/** Toggles a platform user while preserving selections made on other attendee pages. */
export function toggleEventAttendeeSelection(selection: Readonly<Record<string, EventGroupAttendee>>, attendee: EventGroupAttendee): Readonly<Record<string, EventGroupAttendee>> {
  if (!attendee.user_id || !attendee.can_invite) return selection;
  return selection[attendee.user_id]
    ? removeEventAttendeeSelection(selection, attendee.user_id)
    : addEventAttendeeSelection(selection, attendee);
}

/** Toggles a verified Provider by platform user ID and never promotes the current account. */
export function toggleEventGroupProviderSelection(selection: Readonly<Record<string, EventGroupProvider>>, provider: EventGroupProvider): Readonly<Record<string, EventGroupProvider>> {
  if (provider.is_me) return selection;
  if (selection[provider.user_id]) {
    const next = { ...selection };
    delete next[provider.user_id];
    return next;
  }
  return { ...selection, [provider.user_id]: provider };
}

/** Event attendee identity remains unresolved until the backend supplies a verified platform identity contract. */
export function getEventAttendeeIdentityStatus(attendee: EventGroupAttendee): "platform_identity_available" | "pending_backend_verification" | "not_invitable" {
  if (!attendee.can_invite) return "not_invitable";
  if (!attendee.user_id) return "pending_backend_verification";
  return "platform_identity_available";
}

/** Resolves the backend reason used by the picker without turning registration IDs into invite identities. */
export function getEventAttendeeEligibilityReason(attendee: Pick<EventGroupAttendee, "can_invite" | "reason">): EventGroupAttendeeReason | "inviteable" | "not_eligible" {
  if (attendee.can_invite) return "inviteable";
  return attendee.reason ?? "not_eligible";
}

/** Creation is intentionally unavailable until the backend supports Event Group Chat. */
export function isEventGroupCreationEnabled(): false {
  return false;
}

/** Event management is intentionally unavailable until an authorized test environment is approved. */
export function isEventGroupInvitationEnabled(): false {
  return false;
}

/** Detects Event Groups only from authoritative Group detail fields. */
export function isEventGroupWorkspaceContext(group: { kind: string | null; context_type: string | null; context_id: string | null }): boolean {
  return group.kind === "program" && group.context_type === "event" && Boolean(group.context_id?.trim());
}

/** Uses backend Group role and permission fields for Event invitation management visibility. */
export function canManageEventGroupInvitations(group: { kind: string | null; context_type: string | null; context_id: string | null; my_role: string | null; can_invite: boolean | null; enterpriseAdminAuthorized: boolean }): boolean {
  return group.enterpriseAdminAuthorized && isEventGroupWorkspaceContext(group) && group.my_role === "owner" && group.can_invite === true;
}

/** Provides a context-safe label without exposing Training-only metadata for Event Groups. */
export function getGroupWorkspaceContextLabel(group: { kind: string | null; context_type: string | null; context_id: string | null; context_name?: string | null; training_title?: string | null }): string {
  if (isEventGroupWorkspaceContext(group)) return group.context_name?.trim() ? `Event · ${group.context_name.trim()}` : "Event context";
  if (group.context_type?.trim().toLowerCase() === "training") return group.training_title?.trim() || group.context_name?.trim() || "Training context";
  return group.context_name?.trim() || "Group context";
}

/** Returns the REST query prefixes refreshed after an authorized Event invitation. */
export function eventGroupInvitationInvalidationQueryKeys(eventId: string, groupId: string): readonly (readonly unknown[])[] {
  return [
    ["group-chat", "group", groupId],
    ["group-chat", "members", groupId],
    ["group-chat", "current-member", groupId],
    ["group-chat", "invite-members", groupId],
    ["group-chat", "groups"],
    ["event-group"],
    ["event-group", "attendees", eventId],
    ["event-group", "groups", eventId],
  ];
}

/** Computes only the capacity that is knowable before the backend creates a new Event Group. */
export function summarizeEventGroupCapacity(input: { maxMembers: number | null; selectedAttendeeCount: number; selectedProviderCount: number; inviteAllRegistered: boolean }): EventGroupCapacitySummary {
  const ownerReserved = input.maxMembers === null ? 0 : 1;
  const selectedMemberCount = input.selectedAttendeeCount + input.selectedProviderCount;
  const remainingMemberSlots = input.maxMembers === null ? null : Math.max(0, input.maxMembers - ownerReserved - selectedMemberCount);
  return { maxMembers: input.maxMembers, ownerReserved, selectedMemberCount, remainingMemberSlots, inviteAllMayBeCapped: input.inviteAllRegistered };
}

/** Resolves a safe display state for read-only Event queries. */
export function resolveEventGroupQueryState(input: { isPending: boolean; isError: boolean; itemCount: number }): "loading" | "error" | "empty" | "ready" {
  if (input.isPending) return "loading";
  if (input.isError) return "error";
  return input.itemCount === 0 ? "empty" : "ready";
}

/** Returns the Event fields shown in the review step without exposing attendee PII in logs or URLs. */
export function eventGroupReviewLabel(event: Pick<EventGroupEvent, "title" | "id">): string {
  return event.title?.trim() || `Event ${event.id}`;
}

/** Formats a selected local avatar size for the wizard without uploading or logging the file. */
export function formatEventGroupAvatarFileSize(fileSize: number | null): string {
  if (fileSize === null || !Number.isFinite(fileSize) || fileSize < 0) return "Size unavailable";
  if (fileSize < 1024) return `${fileSize} B`;
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`;
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}
