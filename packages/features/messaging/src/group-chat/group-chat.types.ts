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
