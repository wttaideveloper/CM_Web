import { authenticatedFetch } from "@ihp/auth";

export type EnterpriseCatalogEvent = {
  id: string;
  title: string;
  category?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  delivery_mode?: string | null;
  venue?: { name?: string | null; city?: string | null } | null;
};

export type EnterpriseCatalogTraining = {
  id: string;
  title: string;
  category?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  delivery_mode?: string | null;
  venue?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseItems<T>(value: unknown, normalize: (item: Record<string, unknown>) => T | null): T[] {
  const items = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.items) ? value.items : [];
  return items.flatMap((item) => isRecord(item) ? [normalize(item)].filter((value): value is T => value !== null) : []);
}

export async function listEnterpriseCatalogEvents(enterpriseId: string): Promise<EnterpriseCatalogEvent[]> {
  const query = new URLSearchParams({ enterprise_id: enterpriseId, page: "1", page_size: "12" });
  const response = await authenticatedFetch(`/api/v1/events/?${query.toString()}`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load enterprise Events.");
  return parseItems(await response.json(), (item) => typeof item.id === "string" && typeof item.title === "string" ? {
    id: item.id,
    title: item.title,
    category: typeof item.category === "string" ? item.category : null,
    status: typeof item.status === "string" ? item.status : null,
    start_date: typeof item.start_date === "string" ? item.start_date : null,
    end_date: typeof item.end_date === "string" ? item.end_date : null,
    delivery_mode: typeof item.delivery_mode === "string" ? item.delivery_mode : null,
    venue: isRecord(item.venue) ? { name: typeof item.venue.name === "string" ? item.venue.name : null, city: typeof item.venue.city === "string" ? item.venue.city : null } : null,
  } : null);
}

export async function listEnterpriseCatalogTrainings(enterpriseId: string): Promise<EnterpriseCatalogTraining[]> {
  const query = new URLSearchParams({ enterprise_id: enterpriseId, page: "1", page_size: "12" });
  const response = await authenticatedFetch(`/api/v1/trainings/?${query.toString()}`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load enterprise Trainings.");
  return parseItems(await response.json(), (item) => typeof item.id === "string" && typeof item.title === "string" ? {
    id: item.id,
    title: item.title,
    category: typeof item.category === "string" ? item.category : null,
    status: typeof item.status === "string" ? item.status : null,
    start_date: typeof item.start_date === "string" ? item.start_date : null,
    end_date: typeof item.end_date === "string" ? item.end_date : null,
    delivery_mode: typeof item.delivery_mode === "string" ? item.delivery_mode : null,
    venue: typeof item.venue === "string" ? item.venue : null,
  } : null);
}
