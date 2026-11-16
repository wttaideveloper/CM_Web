import { serviceBookingCopy } from "./service-booking-copy.en.ts";

export type ServiceBookingStatusFilter = keyof typeof serviceBookingCopy.statusFilters;

export type ServiceBookingColumnKey = keyof typeof serviceBookingCopy.columns;

export const serviceBookingStatusFilters: readonly ServiceBookingStatusFilter[] = [
  "all",
  "upcoming",
  "completed",
  "cancelled",
];

export const serviceBookingColumnKeys: readonly ServiceBookingColumnKey[] = [
  "reference",
  "customer",
  "service",
  "provider",
  "dateTime",
  "deliveryMode",
  "bookingStatus",
  "paymentStatus",
  "details",
];

/** Returns the stable label for a supported booking status filter. */
export function getServiceBookingStatusLabel(filter: ServiceBookingStatusFilter): string {
  return serviceBookingCopy.statusFilters[filter];
}

/** Returns a safe empty-state message without implying that records were queried. */
export function getServiceBookingEmptyState(): { title: string; description: string } {
  return {
    title: serviceBookingCopy.emptyTitle,
    description: serviceBookingCopy.emptyDescription,
  };
}

/** Formats a future API page label without calculating totals that are not provided. */
export function getServiceBookingPageLabel(page: number): string {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  return serviceBookingCopy.pageLabel.replace("{{page}}", String(safePage));
}

/** Formats pagination metadata returned by the booking list endpoint. */
export function getServiceBookingPageSummary(page: number, total: number, pageSize: number): string {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeTotal = Number.isInteger(total) && total >= 0 ? total : 0;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 1;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));

  return serviceBookingCopy.pageSummary
    .replace("{{page}}", String(safePage))
    .replace("{{totalPages}}", String(totalPages));
}

/** Formats documented enum values for readable, stable table labels. */
export function formatServiceBookingEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Formats a booking appointment in its backend timezone without changing the ISO values. */
export function formatServiceBookingAppointment(
  startsAt: string,
  endsAt: string,
  timezone: string,
): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${startsAt} – ${endsAt} (${timezone})`;

  try {
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: timezone,
    });
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)} (${timezone})`;
  } catch {
    return `${start.toLocaleDateString()} · ${start.toLocaleTimeString()} – ${end.toLocaleTimeString()} (${timezone})`;
  }
}
