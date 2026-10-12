import type { CreateEventVenue, EventVenue } from "./events.service";

function normalizeCoordinate(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Normalizes a backend venue while retaining valid coordinates supplied as numbers or numeric strings. */
export function normalizeEventVenue(value: unknown): EventVenue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const venue: EventVenue = {
    name: record.name === null || record.name === undefined ? record.name : typeof record.name === "string" ? record.name : null,
    address: record.address === null || record.address === undefined ? record.address : typeof record.address === "string" ? record.address : null,
    city: record.city === null || record.city === undefined ? record.city : typeof record.city === "string" ? record.city : null,
  };
  if (record.coordinates && typeof record.coordinates === "object" && !Array.isArray(record.coordinates)) {
    const coordinates = record.coordinates as Record<string, unknown>;
    const lat = normalizeCoordinate(coordinates.lat);
    const lng = normalizeCoordinate(coordinates.lng);
    if (lat !== undefined || lng !== undefined) venue.coordinates = { ...(lat !== undefined ? { lat } : {}), ...(lng !== undefined ? { lng } : {}) };
  }
  return venue;
}

/** Builds the writable venue shape without response-only historical coordinates. */
export function buildEventVenue(name: string, address: string, city: string): CreateEventVenue {
  return { name: name.trim(), address: address.trim(), city: city.trim() };
}
