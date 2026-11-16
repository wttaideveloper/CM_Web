export type ServiceBookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancellation_requested"
  | "cancelled"
  | "no_show"
  | "expired";

export type ServiceBookingPaymentStatus =
  | "not_required"
  | "unpaid"
  | "paid"
  | "refunded"
  | "partially_refunded";

export type ServiceBookingDeliveryMode = "in_person" | "virtual" | "hybrid";

export type ServiceBookingCustomer = {
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type ServiceBookingListItem = {
  id: string;
  status: ServiceBookingStatus;
  payment_status: ServiceBookingPaymentStatus;
  service_id: string;
  service_name: string;
  provider_id: string | null;
  provider_name: string | null;
  enterprise_id: string;
  enterprise_name: string | null;
  delivery_mode: ServiceBookingDeliveryMode;
  starts_at: string;
  ends_at: string;
  timezone: string;
  participants: number;
  amount: number;
  currency: string | null;
  can_cancel: boolean;
  cancel_mode: "instant" | "request" | null;
  can_reschedule: boolean;
  can_join: boolean;
  can_check_in: boolean;
  customer: ServiceBookingCustomer;
  created_at: string | null;
};

export type ServiceBookingListResponse = {
  items: ServiceBookingListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type ServiceBookingHistoryItem = {
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_role: string | null;
  actor_name: string | null;
  reason: string | null;
  at: string | null;
};

export type ServiceBookingDetail = ServiceBookingListItem & {
  duration_minutes: number;
  venue: Record<string, unknown> | null;
  meeting: Record<string, unknown> | null;
  cancel_blocked_reason: string | null;
  join_blocked_reason: string | null;
  cancellation_policy_summary: string;
  cancellation_policy: string | null;
  hold_expires_at: string | null;
  cancellation: Record<string, unknown>;
  payment_id: string | null;
  qr_payload: string | null;
  notes: string | null;
  history?: ServiceBookingHistoryItem[];
  allowed_statuses: string[] | null;
  created_by_role: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableBoolean(value: unknown): value is boolean | null | undefined {
  return value === undefined || value === null || typeof value === "boolean";
}

function isServiceBookingStatus(value: unknown): value is ServiceBookingStatus {
  return [
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancellation_requested",
    "cancelled",
    "no_show",
    "expired",
  ].includes(value as ServiceBookingStatus);
}

function isPaymentStatus(value: unknown): value is ServiceBookingPaymentStatus {
  return ["not_required", "unpaid", "paid", "refunded", "partially_refunded"].includes(
    value as ServiceBookingPaymentStatus,
  );
}

function isDeliveryMode(value: unknown): value is ServiceBookingDeliveryMode {
  return ["in_person", "virtual", "hybrid"].includes(value as ServiceBookingDeliveryMode);
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (!isNullableString(value)) {
    throw new Error(`The Service Booking response field ${key} is malformed.`);
  }

  return value ?? null;
}

function readNullableRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new Error(`The Service Booking response field ${key} is malformed.`);
  }

  return value;
}

function normalizeCustomer(value: unknown): ServiceBookingCustomer {
  if (!isRecord(value)) {
    throw new Error("The Service Booking response customer is malformed.");
  }

  return {
    user_id: readNullableString(value, "user_id"),
    name: readNullableString(value, "name"),
    email: readNullableString(value, "email"),
    phone: readNullableString(value, "phone"),
  };
}

/** Normalizes one documented BookingListItem without fabricating missing values. */
export function normalizeServiceBookingListItem(value: unknown): ServiceBookingListItem {
  if (!isRecord(value)) {
    throw new Error("The Service Booking response contains a malformed item.");
  }

  if (
    !isString(value.id) ||
    !isServiceBookingStatus(value.status) ||
    !isPaymentStatus(value.payment_status) ||
    !isString(value.service_id) ||
    !isString(value.service_name) ||
    !isString(value.enterprise_id) ||
    !isDeliveryMode(value.delivery_mode) ||
    !isString(value.starts_at) ||
    !isString(value.ends_at) ||
    !isString(value.timezone) ||
    !isInteger(value.participants) ||
    !isFiniteNumber(value.amount) ||
    typeof value.can_cancel !== "boolean" ||
    typeof value.can_join !== "boolean"
  ) {
    throw new Error("The Service Booking response contains a malformed item.");
  }

  const cancelMode = value.cancel_mode;
  if (cancelMode !== undefined && cancelMode !== null && cancelMode !== "instant" && cancelMode !== "request") {
    throw new Error("The Service Booking response cancel mode is malformed.");
  }

  if (value.can_reschedule !== undefined && typeof value.can_reschedule !== "boolean") {
    throw new Error("The Service Booking response reschedule flag is malformed.");
  }

  if (value.can_check_in !== undefined && typeof value.can_check_in !== "boolean") {
    throw new Error("The Service Booking response check-in flag is malformed.");
  }

  return {
    id: value.id,
    status: value.status,
    payment_status: value.payment_status,
    service_id: value.service_id,
    service_name: value.service_name,
    provider_id: readNullableString(value, "provider_id"),
    provider_name: readNullableString(value, "provider_name"),
    enterprise_id: value.enterprise_id,
    enterprise_name: readNullableString(value, "enterprise_name"),
    delivery_mode: value.delivery_mode,
    starts_at: value.starts_at,
    ends_at: value.ends_at,
    timezone: value.timezone,
    participants: value.participants,
    amount: value.amount,
    currency: readNullableString(value, "currency"),
    can_cancel: value.can_cancel,
    cancel_mode: cancelMode ?? null,
    can_reschedule: value.can_reschedule ?? false,
    can_join: value.can_join,
    can_check_in: value.can_check_in ?? false,
    customer: normalizeCustomer(value.customer),
    created_at: readNullableString(value, "created_at"),
  };
}

/** Validates the documented BookingListResponse envelope and preserves backend totals. */
export function normalizeServiceBookingListResponse(value: unknown): ServiceBookingListResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("The Service Booking response is malformed.");
  }

  if (
    !isInteger(value.total) ||
    value.total < 0 ||
    !isInteger(value.page) ||
    value.page < 1 ||
    !isInteger(value.page_size) ||
    value.page_size < 1
  ) {
    throw new Error("The Service Booking pagination metadata is malformed.");
  }

  return {
    items: value.items.map(normalizeServiceBookingListItem),
    total: value.total,
    page: value.page,
    page_size: value.page_size,
  };
}

/** Normalizes one documented BookingDetail without exposing undocumented nested fields. */
export function normalizeServiceBookingDetailResponse(value: unknown): ServiceBookingDetail {
  if (!isRecord(value)) {
    throw new Error("The Service Booking detail response is malformed.");
  }

  const listItem = normalizeServiceBookingListItem(value);
  if (
    !isInteger(value.duration_minutes) ||
    value.duration_minutes < 0 ||
    !isString(value.cancellation_policy_summary) ||
    !isRecord(value.cancellation)
  ) {
    throw new Error("The Service Booking detail response is malformed.");
  }

  if (!isNullableBoolean(value.can_reschedule) || !isNullableBoolean(value.can_check_in)) {
    throw new Error("The Service Booking detail permissions are malformed.");
  }

  const history = value.history === undefined ? undefined : normalizeServiceBookingHistoryResponse(value.history);
  const allowedStatuses = value.allowed_statuses;
  if (
    allowedStatuses !== undefined &&
    allowedStatuses !== null &&
    (!Array.isArray(allowedStatuses) || !allowedStatuses.every(isString))
  ) {
    throw new Error("The Service Booking allowed statuses are malformed.");
  }

  return {
    ...listItem,
    duration_minutes: value.duration_minutes,
    venue: readNullableRecord(value, "venue"),
    meeting: readNullableRecord(value, "meeting"),
    cancel_blocked_reason: readNullableString(value, "cancel_blocked_reason"),
    join_blocked_reason: readNullableString(value, "join_blocked_reason"),
    cancellation_policy_summary: value.cancellation_policy_summary,
    cancellation_policy: readNullableString(value, "cancellation_policy"),
    hold_expires_at: readNullableString(value, "hold_expires_at"),
    cancellation: value.cancellation,
    payment_id: readNullableString(value, "payment_id"),
    qr_payload: readNullableString(value, "qr_payload"),
    notes: readNullableString(value, "notes"),
    ...(history !== undefined ? { history } : {}),
    allowed_statuses: allowedStatuses ?? null,
    created_by_role: readNullableString(value, "created_by_role"),
  };
}

/** Normalizes the array returned by the documented booking history endpoint. */
export function normalizeServiceBookingHistoryResponse(value: unknown): ServiceBookingHistoryItem[] {
  if (!Array.isArray(value)) {
    throw new Error("The Service Booking history response is malformed.");
  }

  return value.map((entry) => {
    if (!isRecord(entry) || !isString(entry.action)) {
      throw new Error("The Service Booking history contains a malformed item.");
    }

    return {
      action: entry.action,
      from_status: readNullableString(entry, "from_status"),
      to_status: readNullableString(entry, "to_status"),
      actor_role: readNullableString(entry, "actor_role"),
      actor_name: readNullableString(entry, "actor_name"),
      reason: readNullableString(entry, "reason"),
      at: readNullableString(entry, "at"),
    };
  });
}
