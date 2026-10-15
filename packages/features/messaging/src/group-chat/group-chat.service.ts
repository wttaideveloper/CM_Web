import { chatRequestResponse } from "@ihp/chat-runtime";

import type {
  GroupChatLearner,
  GroupChatLearnerListParams,
  GroupChatLearnerListResponse,
  GroupChatPagination,
  GroupChatProvider,
  GroupChatProviderListParams,
  GroupChatProviderListResponse,
  GroupChatTraining,
  GroupChatTrainingListParams,
  GroupChatTrainingListResponse,
} from "./group-chat.types";

const GROUP_CHAT_API_PATH = "/groups";
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_MAX_MEMBERS = 50;

/** Safe, status-aware error exposed by the read-only Group Chat API client. */
export class GroupChatApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GroupChatApiError";
    this.status = status;
  }
}

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

function readPagination(value: unknown, page: number, pageSize: number, totalFallback: number): GroupChatPagination {
  const source = isRecord(value) ? value : {};
  const total = readNumber(source.total) ?? totalFallback;
  const resolvedPage = readNumber(source.page) ?? page;
  const resolvedPageSize = readNumber(source.page_size) ?? pageSize;
  const totalPages = readNumber(source.total_pages) ?? Math.max(1, Math.ceil(total / Math.max(1, resolvedPageSize)));
  return { total, page: resolvedPage, page_size: resolvedPageSize, total_pages: totalPages };
}

function readPaginationFromEnvelope(envelope: Record<string, unknown>, page: number, pageSize: number, total: number): GroupChatPagination {
  return readPagination(isRecord(envelope.pagination) ? envelope.pagination : envelope, page, pageSize, readNumber(envelope.total) ?? total);
}

function safeApiMessage(status: number): string {
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You do not have access to this Training group data.";
  if (status === 404) return "The requested Training group data was not found.";
  if (status === 422) return "The Training group request was invalid.";
  if (status === 429) return "Too many requests. Try again shortly.";
  if (status >= 500) return "Training group data is temporarily unavailable.";
  return "Unable to load Training group data.";
}

async function request<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  try {
    const response = await chatRequestResponse(`${GROUP_CHAT_API_PATH}${path}?${params.toString()}`, { signal });
    if (!response.ok) throw new GroupChatApiError(response.status, safeApiMessage(response.status));
    return (await response.json()) as T;
  } catch (error: unknown) {
    if (error instanceof GroupChatApiError) throw error;
    const status = isRecord(error) && typeof error.status === "number" ? error.status : 0;
    throw new GroupChatApiError(status, status ? safeApiMessage(status) : "Unable to load Training group data.");
  }
}

function appendCommonParams(params: URLSearchParams, page: number, pageSize: number): void {
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
}

function parseTraining(value: unknown): GroupChatTraining | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  if (!id) return null;
  return {
    id,
    title: readString(value.title) ?? "Untitled Training",
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
  if (!isRecord(value) || !Array.isArray(value.items)) throw new Error("The Training list response was invalid.");
  const items = value.items.map(parseTraining).filter((item): item is GroupChatTraining => item !== null);
  return { items, pagination: readPaginationFromEnvelope(value, page, pageSize, items.length) };
}

function parseLearner(value: unknown): GroupChatLearner | null {
  if (!isRecord(value)) return null;
  const enrolmentId = readString(value.enrolment_id);
  if (!enrolmentId) return null;
  const groupIds = Array.isArray(value.group_ids) ? value.group_ids.filter((id): id is string => typeof id === "string" && Boolean(id.trim())) : [];
  return {
    enrolment_id: enrolmentId,
    name: readString(value.name) ?? "Enrolled learner",
    email: readString(value.email),
    enrolment_status: readString(value.enrolment_status) ?? "",
    user_id: readString(value.user_id),
    can_invite: readBoolean(value.can_invite),
    reason: readString(value.reason),
    group_state: readString(value.group_state),
    group_ids: groupIds,
    enrolled_at: readString(value.enrolled_at),
  };
}

function parseLearnerList(value: unknown, trainingId: string, page: number, pageSize: number): GroupChatLearnerListResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) throw new Error("The learner list response was invalid.");
  const items = value.items.map(parseLearner).filter((item): item is GroupChatLearner => item !== null);
  const maxMembers = readNumber(value.max_members) ?? DEFAULT_MAX_MEMBERS;
  return {
    training_id: readString(value.training_id) ?? trainingId,
    training_title: readString(value.training_title),
    items,
    pagination: readPaginationFromEnvelope(value, page, pageSize, items.length),
    eligible_total: readNumber(value.eligible_total),
    max_members: maxMembers > 0 ? maxMembers : DEFAULT_MAX_MEMBERS,
  };
}

function parseProvider(value: unknown): GroupChatProvider | null {
  if (!isRecord(value)) return null;
  const userId = readString(value.user_id);
  if (!userId) return null;
  return {
    user_id: userId,
    name: readString(value.name) ?? "Verified Provider",
    registration_number: readString(value.registration_number),
    is_training_instructor: readBoolean(value.is_training_instructor),
    is_me: readBoolean(value.is_me),
  };
}

function parseProviderList(value: unknown, trainingId: string, page: number, pageSize: number): GroupChatProviderListResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) throw new Error("The Provider list response was invalid.");
  const items = value.items.map(parseProvider).filter((item): item is GroupChatProvider => item !== null);
  return {
    training_id: readString(value.training_id) ?? trainingId,
    instructor_name: readString(value.instructor_name),
    items,
    pagination: readPaginationFromEnvelope(value, page, pageSize, items.length),
  };
}

function makeParams(page = 1, pageSize = DEFAULT_PAGE_SIZE): URLSearchParams {
  const params = new URLSearchParams();
  appendCommonParams(params, page, pageSize);
  return params;
}

/** Loads the Trainings visible to the authenticated Group Chat creator. */
export async function listGroupChatTrainings(params: GroupChatTrainingListParams = {}): Promise<GroupChatTrainingListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = makeParams(page, pageSize);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  const response = await request<unknown>("/trainings", query, params.signal);
  return parseTrainingList(response, page, pageSize);
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
  const response = await request<unknown>(`/trainings/${encodeURIComponent(trainingId)}/learners`, query, params.signal);
  return parseLearnerList(response, trainingId, page, pageSize);
}

/** Loads authorized verified Provider candidates for one Training. */
export async function listGroupChatProviders(trainingId: string, params: GroupChatProviderListParams = {}): Promise<GroupChatProviderListResponse> {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  const response = await request<unknown>(`/trainings/${encodeURIComponent(trainingId)}/providers`, query, params.signal);
  return parseProviderList(response, trainingId, 1, DEFAULT_PAGE_SIZE);
}
