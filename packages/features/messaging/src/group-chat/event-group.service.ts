import type {
  EventGroupApiRequest,
  EventGroupAttendeeListParams,
  EventGroupAttendeeListResponse,
  EventGroupCreatePayload,
  EventGroupEventListParams,
  EventGroupEventListResponse,
  EventGroupListResponse,
  EventGroupSummary,
  EventGroupProviderListParams,
  EventGroupProviderListResponse,
  InviteRegisteredPayload,
  InviteRegisteredResponse,
} from "./event-group.types";
import {
  buildEventGroupCreatePayload,
  buildInviteRegisteredPayload,
  normalizeEventGroupAttendeesResponse,
  normalizeEventGroupEventsResponse,
  normalizeEventGroupListResponse,
  normalizeEventGroupProvidersResponse,
  normalizeInviteRegisteredResponse,
  isValidEventGroupUserId,
} from "./event-group.models.ts";

const DEFAULT_EVENT_PAGE_SIZE = 20;
const DEFAULT_ATTENDEE_PAGE_SIZE = 50;

export class EventGroupApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "EventGroupApiError";
    this.status = status;
  }
}

const defaultEventGroupRequest: EventGroupApiRequest = async (path, init) => {
  const { groupChatRequestResponse } = await import("@ihp/chat-runtime");
  return groupChatRequestResponse(path, init);
};

function safeErrorMessage(status: number): string {
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You do not have access to this Event Group action.";
  if (status === 404) return "The requested Event Group data was not found.";
  if (status === 409) return "This Event Group changed or has reached its member capacity.";
  if (status === 422) return "The Event Group request was invalid.";
  if (status === 429) return "Too many requests. Try again shortly.";
  if (status >= 500) return "Event Group data is temporarily unavailable.";
  return "Unable to complete the Event Group request.";
}

async function responseErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return safeErrorMessage(response.status);
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
      const detail = (body as Record<string, unknown>).detail;
      if (typeof detail === "string" && detail.trim()) return detail.trim();
      if (Array.isArray(detail)) {
        const messages = detail.map((item) => {
          if (typeof item === "string") return item.trim();
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            const record = item as Record<string, unknown>;
            const message = typeof record.msg === "string" ? record.msg.trim() : "";
            const location = Array.isArray(record.loc) ? record.loc.filter((part): part is string | number => typeof part === "string" || typeof part === "number").join(".") : "";
            return message && location ? `${location}: ${message}` : message;
          }
          return "";
        }).filter(Boolean);
        if (messages.length > 0) return messages.join("; ");
      }
      const message = (body as Record<string, unknown>).message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }
  } catch {
    // Preserve the safe status message for non-JSON errors.
  }
  return safeErrorMessage(response.status);
}

async function requestJson<T>(request: EventGroupApiRequest, path: string, init: RequestInit = {}, expectedStatus?: number): Promise<T> {
  let response: Response;
  try {
    response = await request(path, init);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new EventGroupApiError(0, "Unable to reach the Event Group service.");
  }
  if (!response.ok) throw new EventGroupApiError(response.status, await responseErrorMessage(response));
  if (expectedStatus !== undefined && response.status !== expectedStatus) throw new EventGroupApiError(502, `The Event Group service returned an unexpected success status (${response.status}).`);
  const text = await response.text();
  if (!text.trim()) throw new EventGroupApiError(502, "The Event Group service returned an empty response.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new EventGroupApiError(502, "The Event Group service returned invalid JSON.");
  }
}

function pageValue(value: number | undefined, fallback: number): number {
  return value && value > 0 ? Math.floor(value) : fallback;
}

function addText(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value?.trim()) params.set(key, value.trim());
}

function addBoolean(params: URLSearchParams, key: string, value: boolean | undefined): void {
  if (value !== undefined) params.set(key, String(value));
}

function addPage(params: URLSearchParams, page: number | undefined, pageSize: number | undefined, defaultPageSize: number): void {
  params.set("page", String(pageValue(page, 1)));
  params.set("page_size", String(pageValue(pageSize, defaultPageSize)));
}

function requireId(value: string, label: string): string {
  const id = value.trim();
  if (!id) throw new EventGroupApiError(422, `${label} is required.`);
  return id;
}

function validateInviteRegisteredPayload(payload: InviteRegisteredPayload): void {
  const userIds = payload.user_ids ?? [];
  const excludedUserIds = payload.exclude_user_ids ?? [];
  if (payload.all_eligible !== true && userIds.length === 0) {
    throw new EventGroupApiError(422, "Select at least one eligible Event attendee or verified Provider.");
  }
  if (userIds.some((userId) => !isValidEventGroupUserId(userId)) || excludedUserIds.some((userId) => !isValidEventGroupUserId(userId))) {
    throw new EventGroupApiError(422, "Event invitation identities must be valid platform user IDs.");
  }
}

export function createEventGroupApiClient(request: EventGroupApiRequest = defaultEventGroupRequest) {
  return {
    async listEvents(params: EventGroupEventListParams = {}): Promise<EventGroupEventListResponse> {
      const query = new URLSearchParams();
      addText(query, "q", params.q);
      addText(query, "status", params.status);
      addPage(query, params.page, params.pageSize, DEFAULT_EVENT_PAGE_SIZE);
      const raw = await requestJson<unknown>(request, `/groups/events?${query.toString()}`, { method: "GET", signal: params.signal });
      const normalized = normalizeEventGroupEventsResponse(raw);
      if (!normalized) throw new EventGroupApiError(502, "The Event Group events response was invalid.");
      return normalized;
    },

    async listAttendees(eventId: string, params: EventGroupAttendeeListParams = {}): Promise<EventGroupAttendeeListResponse> {
      const query = new URLSearchParams();
      addText(query, "q", params.q);
      addBoolean(query, "eligible_only", params.eligibleOnly);
      addText(query, "registration_status", params.registrationStatus);
      addText(query, "payment_status", params.paymentStatus);
      addBoolean(query, "not_in_group", params.notInGroup);
      addText(query, "group_id", params.groupId);
      addPage(query, params.page, params.pageSize, DEFAULT_ATTENDEE_PAGE_SIZE);
      const id = requireId(eventId, "The Event identifier");
      const raw = await requestJson<unknown>(request, `/groups/events/${encodeURIComponent(id)}/attendees?${query.toString()}`, { method: "GET", signal: params.signal });
      const normalized = normalizeEventGroupAttendeesResponse(raw);
      if (!normalized) throw new EventGroupApiError(502, "The Event Group attendee response was invalid.");
      return normalized;
    },

    async listProviders(eventId: string, params: EventGroupProviderListParams = {}): Promise<EventGroupProviderListResponse> {
      const query = new URLSearchParams();
      addText(query, "q", params.q);
      const id = requireId(eventId, "The Event identifier");
      const raw = await requestJson<unknown>(request, `/groups/events/${encodeURIComponent(id)}/providers${query.toString() ? `?${query.toString()}` : ""}`, { method: "GET", signal: params.signal });
      const normalized = normalizeEventGroupProvidersResponse(raw);
      if (!normalized) throw new EventGroupApiError(502, "The Event Group Provider response was invalid.");
      return normalized;
    },

    async listGroups(eventId: string, signal?: AbortSignal): Promise<EventGroupListResponse> {
      const id = requireId(eventId, "The Event identifier");
      const raw = await requestJson<unknown>(request, `/groups/events/${encodeURIComponent(id)}/groups`, { method: "GET", signal });
      const normalized = normalizeEventGroupListResponse(raw);
      if (!normalized) throw new EventGroupApiError(502, "The Event Group list response was invalid.");
      return normalized;
    },

    async createGroup(payload: EventGroupCreatePayload): Promise<EventGroupSummary> {
      const body = buildEventGroupCreatePayload({
        name: payload.name,
        contextId: payload.context_id,
        description: payload.description,
        avatarUrl: payload.avatar_url,
        invitees: payload.invitees,
        adminsOnlyPosting: payload.admins_only_posting,
        inviteAllRegistered: payload.invite_all_registered,
        excludeUserIds: payload.exclude_user_ids,
      });
      const raw = await requestJson<unknown>(request, "/groups", { method: "POST", body: JSON.stringify(body) }, 201);
      const normalized = normalizeEventGroupListResponse({ items: [raw], total: 1 });
      const group = normalized?.items[0] ?? null;
      if (!group) throw new EventGroupApiError(502, "The Event Group creation response was invalid.");
      return group;
    },

    async inviteRegistered(groupId: string, payload: InviteRegisteredPayload): Promise<InviteRegisteredResponse> {
      const id = requireId(groupId, "The Group identifier");
      const body = buildInviteRegisteredPayload(payload);
      validateInviteRegisteredPayload(body);
      const raw = await requestJson<unknown>(request, `/groups/${encodeURIComponent(id)}/members/invite-registered`, { method: "POST", body: JSON.stringify(body) }, 201);
      const normalized = normalizeInviteRegisteredResponse(raw);
      if (!normalized) throw new EventGroupApiError(502, "The Event Group invitation response was invalid.");
      return normalized;
    },
  };
}

const defaultClient = createEventGroupApiClient();

export const listEventGroupEvents = (params?: EventGroupEventListParams) => defaultClient.listEvents(params);
export const listEventGroupAttendees = (eventId: string, params?: EventGroupAttendeeListParams) => defaultClient.listAttendees(eventId, params);
export const listEventGroupProviders = (eventId: string, params?: EventGroupProviderListParams) => defaultClient.listProviders(eventId, params);
export const listEventGroupGroups = (eventId: string, signal?: AbortSignal) => defaultClient.listGroups(eventId, signal);
export const createEventGroup = (payload: EventGroupCreatePayload) => defaultClient.createGroup(payload);
export const inviteRegisteredGroupMembers = (groupId: string, payload: InviteRegisteredPayload) => defaultClient.inviteRegistered(groupId, payload);
