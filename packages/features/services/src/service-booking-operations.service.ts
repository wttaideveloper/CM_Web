import {
  normalizeCreatedServiceBooking,
  normalizeServiceBookingSettingsResponse,
  normalizeServiceBookingSlotsResponse,
  type CreateServiceBookingPayload,
  type ServiceBookingSettings,
  type ServiceBookingSlotsResponse,
} from "./service-booking-operations.models.ts";
import {
  buildServiceBookingCreateUrl,
  readServiceBookingApiError,
  ServiceBookingApiError,
} from "./service-booking.service.ts";
import type { ServiceBookingDetail } from "./service-booking.models.ts";

export * from "./service-booking-operations.models.ts";

const serviceBookingApiBase = "/api/v1";

export type ServiceBookingSlotsRequest = {
  date: string;
  providerId?: string;
  deliveryMode?: CreateServiceBookingPayload["delivery_mode"];
  timezone?: string;
};

function requireId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

export function buildServiceBookingSlotsUrl(serviceId: string, request: ServiceBookingSlotsRequest): string {
  const query = new URLSearchParams({ date: requireId(request.date, "A date") });
  if (request.providerId?.trim()) query.set("provider_id", request.providerId.trim());
  if (request.deliveryMode) query.set("delivery_mode", request.deliveryMode);
  if (request.timezone?.trim()) query.set("timezone", request.timezone.trim());
  return `${serviceBookingApiBase}/services/${encodeURIComponent(requireId(serviceId, "A service ID"))}/available-slots?${query.toString()}`;
}

export function buildServiceBookingSettingsUrl(serviceId: string): string {
  return `${serviceBookingApiBase}/services/${encodeURIComponent(requireId(serviceId, "A service ID"))}/booking-settings`;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });
  if (!response.ok) throw await readServiceBookingApiError(response);
  return response.json();
}

export async function getServiceBookingSlots(
  serviceId: string,
  request: ServiceBookingSlotsRequest,
  signal?: AbortSignal,
): Promise<ServiceBookingSlotsResponse> {
  return normalizeServiceBookingSlotsResponse(await getJson(buildServiceBookingSlotsUrl(serviceId, request), signal));
}

export async function getServiceBookingSettings(serviceId: string, signal?: AbortSignal): Promise<ServiceBookingSettings> {
  return normalizeServiceBookingSettingsResponse(await getJson(buildServiceBookingSettingsUrl(serviceId), signal));
}

/** Creates one Enterprise Admin booking. The caller must supply a fresh idempotency key. */
export async function createEnterpriseServiceBooking(
  payload: CreateServiceBookingPayload,
  idempotencyKey: string,
): Promise<ServiceBookingDetail> {
  const key = requireId(idempotencyKey, "An idempotency key");
  const response = await fetch(buildServiceBookingCreateUrl(), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await readServiceBookingApiError(response);
  return normalizeCreatedServiceBooking(await response.json());
}

export function serviceBookingCreationErrorMessage(error: unknown): string {
  if (!(error instanceof ServiceBookingApiError)) return "The booking could not be created. Try again.";
  if (error.source === "next" || error.code === "NEXT_ROUTE_NOT_FOUND") {
    return "The Enterprise Admin booking proxy route was not found.";
  }
  if (error.status === 401 || error.status === 403) {
    return "You are not authorized to create this booking.";
  }
  if (error.status === 404) {
    return "The booking endpoint or selected resource was not found.";
  }
  if (error.status === 422) {
    return "The booking details failed backend validation.";
  }
  switch (error.code) {
    case "SLOT_FULL": return "That slot is full. Choose another slot.";
    case "PROVIDER_UNAVAILABLE": return "The provider is unavailable for that slot.";
    case "SLOT_NOT_OFFERED": return "That slot is no longer offered.";
    case "SLOT_NOT_BOOKABLE": return "That slot is not bookable.";
    case "DUPLICATE_BOOKING": return "This customer already has a booking for that slot.";
    case "SERVICE_NOT_BOOKABLE": return "This Service is not currently bookable.";
    case "DELIVERY_MODE_REQUIRED": return "Choose a delivery mode before booking.";
    case "INVALID_STARTS_AT": return "The selected appointment time is invalid.";
    default: return error.message;
  }
}
