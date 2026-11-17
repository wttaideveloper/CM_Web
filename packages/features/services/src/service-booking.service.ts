import type { ServiceBookingStatusFilter } from "./service-booking-management";
import {
  normalizeServiceBookingDetailResponse,
  normalizeServiceBookingCancellationRequestListResponse,
  normalizeServiceBookingHistoryResponse,
  normalizeServiceBookingListResponse,
  type ServiceBookingCancellationRequestListResponse,
  type ServiceBookingCancellationDecisionPayload,
  type ServiceBookingCancellationRejectionPayload,
  type ServiceBookingDetail,
  type ServiceBookingHistoryItem,
  type ServiceBookingListResponse,
  type UpdateServiceBookingStatusPayload,
} from "./service-booking.models.ts";

export * from "./service-booking.models.ts";

export const SERVICE_BOOKING_PAGE_SIZE = 10;

export type GetEnterpriseServiceBookingsRequest = {
  enterpriseId: string;
  search?: string;
  statusFilter: ServiceBookingStatusFilter;
  page: number;
  pageSize?: number;
};

export type GetEnterpriseServiceBookingCancellationRequestsRequest = {
  enterpriseId: string;
  page: number;
  pageSize?: number;
};

/** Represents a safe, status-aware read failure from the Service Booking API. */
export class ServiceBookingApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly source: "backend" | "next";

  constructor(message: string, status: number, code: string | null = null, source: "backend" | "next" = "backend") {
    super(message);
    this.name = "ServiceBookingApiError";
    this.status = status;
    this.code = code;
    this.source = source;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Builds only the documented Enterprise Service Booking list query parameters. */
export function buildEnterpriseServiceBookingsUrl(
  request: GetEnterpriseServiceBookingsRequest,
): string {
  const enterpriseId = request.enterpriseId.trim();
  if (!enterpriseId) {
    throw new Error("An enterprise ID is required to load Service Bookings.");
  }

  const query = new URLSearchParams();
  const search = request.search?.trim();
  if (search) query.set("q", search);

  if (request.statusFilter === "upcoming") query.set("when", "upcoming");
  if (request.statusFilter === "completed" || request.statusFilter === "cancelled") {
    query.set("status", request.statusFilter);
  }

  query.set("page", String(Math.max(1, Math.floor(request.page))));
  query.set("page_size", String(Math.max(1, Math.floor(request.pageSize ?? SERVICE_BOOKING_PAGE_SIZE))));

  return `/api/v1/enterprises/${encodeURIComponent(enterpriseId)}/service-bookings?${query.toString()}`;
}

/** Returns a stable React Query key scoped to the authenticated enterprise and list state. */
export function enterpriseServiceBookingsQueryKey(request: GetEnterpriseServiceBookingsRequest) {
  return [
    "enterprise-service-bookings",
    request.enterpriseId,
    request.search?.trim() ?? "",
    request.statusFilter,
    request.page,
    request.pageSize ?? SERVICE_BOOKING_PAGE_SIZE,
  ] as const;
}

function bookingPath(bookingId: string, suffix = ""): string {
  const normalizedBookingId = bookingId.trim();
  if (!normalizedBookingId) {
    throw new Error("A booking ID is required to load Service Booking data.");
  }

  return `/api/v1/service-bookings/${encodeURIComponent(normalizedBookingId)}${suffix}`;
}

/** Builds the documented read-only booking detail path. */
export function buildServiceBookingDetailUrl(bookingId: string): string {
  return bookingPath(bookingId);
}

/** Builds the documented read-only booking history path. */
export function buildServiceBookingHistoryUrl(bookingId: string): string {
  return bookingPath(bookingId, "/history");
}

/** Builds the Enterprise-scoped cancellation-request collection using backend query names. */
export function buildEnterpriseServiceBookingCancellationRequestsUrl(
  request: GetEnterpriseServiceBookingCancellationRequestsRequest,
): string {
  const enterpriseId = request.enterpriseId.trim();
  if (!enterpriseId) {
    throw new Error("An enterprise ID is required to load cancellation requests.");
  }

  const query = new URLSearchParams();
  query.set("page", String(Math.max(1, Math.floor(request.page))));
  query.set("page_size", String(Math.max(1, Math.floor(request.pageSize ?? SERVICE_BOOKING_PAGE_SIZE))));

  return `/api/v1/enterprises/${encodeURIComponent(enterpriseId)}/service-bookings/cancellation-requests?${query.toString()}`;
}

export function enterpriseServiceBookingCancellationRequestsQueryKey(
  request: GetEnterpriseServiceBookingCancellationRequestsRequest,
) {
  return [
    "enterprise-service-booking-cancellation-requests",
    request.enterpriseId,
    request.page,
    request.pageSize ?? SERVICE_BOOKING_PAGE_SIZE,
  ] as const;
}

/** Builds the documented booking status mutation path. */
export function buildServiceBookingStatusUrl(bookingId: string): string {
  return bookingPath(bookingId, "/status");
}

/** Builds the documented cancellation approval path. */
export function buildServiceBookingCancellationApprovalUrl(bookingId: string): string {
  return bookingPath(bookingId, "/cancellation/approve");
}

/** Builds the documented cancellation rejection path. */
export function buildServiceBookingCancellationRejectionUrl(bookingId: string): string {
  return bookingPath(bookingId, "/cancellation/reject");
}

/** Builds the shared collection path used by the Enterprise Admin booking POST. */
export function buildServiceBookingCreateUrl(): string {
  return "/api/v1/service-bookings";
}

export async function readServiceBookingApiError(response: Response): Promise<ServiceBookingApiError> {
  const contentType = response.headers?.get("content-type") ?? "";
  let rawBody = "";
  let body: unknown = null;

  if (typeof response.text === "function") {
    rawBody = await response.text().catch(() => "");
    try {
      body = rawBody ? JSON.parse(rawBody) as unknown : null;
    } catch {
      body = null;
    }
  } else {
    body = await response.json().catch(() => null) as unknown;
  }

  if (
    response.status === 404 &&
    contentType.includes("text/html") &&
    /This page could not be found|NEXT_NOT_FOUND/i.test(rawBody)
  ) {
    return new ServiceBookingApiError(
      "The Enterprise Admin booking proxy route was not found.",
      response.status,
      "NEXT_ROUTE_NOT_FOUND",
      "next",
    );
  }

  const detail = isRecord(body) ? body.detail : undefined;
  const code = isRecord(detail) && typeof detail.code === "string" ? detail.code : null;
  const message = typeof detail === "string" && detail.trim()
    ? detail.trim().slice(0, 300)
    : isRecord(detail) && typeof detail.message === "string" && detail.message.trim()
      ? detail.message.trim().slice(0, 300)
      : `Unable to load Service Bookings (HTTP ${response.status}).`;

  return new ServiceBookingApiError(message, response.status, code);
}

async function getServiceBookingJson(bookingId: string, suffix: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(bookingPath(bookingId, suffix), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw await readServiceBookingApiError(response);
  }

  return response.json();
}

/** Loads one backend-paginated Enterprise Service Booking page with request cancellation support. */
export async function getEnterpriseServiceBookings(
  request: GetEnterpriseServiceBookingsRequest,
  signal?: AbortSignal,
): Promise<ServiceBookingListResponse> {
  const response = await fetch(buildEnterpriseServiceBookingsUrl(request), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw await readServiceBookingApiError(response);
  }

  return normalizeServiceBookingListResponse(await response.json());
}

/** Loads one read-only Service Booking detail for the authenticated Enterprise context. */
export async function getServiceBookingDetail(
  bookingId: string,
  signal?: AbortSignal,
): Promise<ServiceBookingDetail> {
  return normalizeServiceBookingDetailResponse(await getServiceBookingJson(bookingId, "", signal));
}

/** Loads one read-only Service Booking status history. */
export async function getServiceBookingHistory(
  bookingId: string,
  signal?: AbortSignal,
): Promise<ServiceBookingHistoryItem[]> {
  return normalizeServiceBookingHistoryResponse(await getServiceBookingJson(bookingId, "/history", signal));
}

/** Loads one backend-paginated Enterprise cancellation-request page. */
export async function getEnterpriseServiceBookingCancellationRequests(
  request: GetEnterpriseServiceBookingCancellationRequestsRequest,
  signal?: AbortSignal,
): Promise<ServiceBookingCancellationRequestListResponse> {
  const response = await fetch(buildEnterpriseServiceBookingCancellationRequestsUrl(request), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!response.ok) throw await readServiceBookingApiError(response);
  return normalizeServiceBookingCancellationRequestListResponse(await response.json());
}

/** Updates a booking status exactly once; callers must not retry this mutation automatically. */
export async function updateServiceBookingStatus(
  bookingId: string,
  payload: UpdateServiceBookingStatusPayload,
): Promise<ServiceBookingDetail> {
  const status = payload.status.trim();
  if (!status) throw new Error("A booking status is required.");

  const response = await fetch(buildServiceBookingStatusUrl(bookingId), {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      ...(payload.reason?.trim() ? { reason: payload.reason.trim() } : {}),
    }),
  });

  if (!response.ok) throw await readServiceBookingApiError(response);
  return normalizeServiceBookingDetailResponse(await response.json());
}

async function postCancellationDecision(
  url: string,
  payload: ServiceBookingCancellationDecisionPayload | ServiceBookingCancellationRejectionPayload,
): Promise<ServiceBookingDetail> {
  const reason = payload.reason?.trim();
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason ? { reason } : {}),
  });

  if (!response.ok) throw await readServiceBookingApiError(response);
  return normalizeServiceBookingDetailResponse(await response.json());
}

/** Approves a cancellation using only the documented optional reason field. */
export async function approveServiceBookingCancellation(
  bookingId: string,
  payload: ServiceBookingCancellationDecisionPayload = {},
): Promise<ServiceBookingDetail> {
  return postCancellationDecision(buildServiceBookingCancellationApprovalUrl(bookingId), payload);
}

/** Rejects a cancellation and requires the documented minimum reason length. */
export async function rejectServiceBookingCancellation(
  bookingId: string,
  payload: ServiceBookingCancellationRejectionPayload,
): Promise<ServiceBookingDetail> {
  const reason = payload.reason.trim();
  if (reason.length < 3) throw new Error("A rejection reason must contain at least 3 non-whitespace characters.");
  return postCancellationDecision(buildServiceBookingCancellationRejectionUrl(bookingId), { reason });
}

export function serviceBookingCancellationDecisionErrorMessage(error: unknown): string {
  if (!(error instanceof ServiceBookingApiError)) return "The cancellation decision could not be submitted. Try again.";
  if (error.source === "next" || error.code === "NEXT_ROUTE_NOT_FOUND") return "The Enterprise Admin cancellation proxy route was not found.";
  if (error.status === 400 || error.status === 422) return error.message || "The cancellation decision failed backend validation.";
  if (error.status === 401) return "Your session is no longer authorized to manage this cancellation.";
  if (error.status === 403) return "You are not authorized to manage this cancellation.";
  if (error.status === 404) return "This booking or cancellation request is no longer available.";
  if (error.status === 409) return error.message || "This cancellation request has already changed. Refresh before trying again.";
  return error.message || "The cancellation decision could not be submitted. Try again.";
}

export function serviceBookingStatusErrorMessage(error: unknown): string {
  if (!(error instanceof ServiceBookingApiError)) return "The booking status could not be updated. Try again.";
  if (error.source === "next" || error.code === "NEXT_ROUTE_NOT_FOUND") {
    return "The Enterprise Admin booking status proxy route was not found.";
  }
  if (error.status === 400 || error.status === 422) return error.message || "The status change failed backend validation.";
  if (error.status === 401) return "Your session is no longer authorized to update this booking.";
  if (error.status === 403) return "You are not authorized to update this booking.";
  if (error.status === 404) return "This booking is no longer available.";
  if (error.status === 409) return error.message || "The booking status changed elsewhere. Reload and try again.";
  return error.message || "The booking status could not be updated. Try again.";
}
